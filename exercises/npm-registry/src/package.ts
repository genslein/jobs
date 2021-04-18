import { json, RequestHandler } from 'express';
import got from 'got';
import { NPMPackage } from './types';

/**
 * Attempts to retrieve package data from the npm registry and return it
 */
export const getPackage: RequestHandler = async function (req, res, next) {
  const { name, version } = req.params;

  try {
    const initialDependencies = (await queryNpmSource(name)).versions[version].dependencies;

    const dependencies = constructDependencyTree(initialDependencies);
    return res.status(200).json({ name, version, dependencies });
  } catch (error) {
    return next(error);
  }
};

export const queryNpmSource = async function (name) {
  const npmPackage: NPMPackage = await got(
    `https://registry.npmjs.org/${name}`,
  ).json();

  return npmPackage;
}

// Uses recursion to build the tree
// TODO: While dependency resolution should be a tree
//       it is theoretically possible to have cycle creating a graph instead. Cycles
//       would hang the current algorithm and would need additional checks
//       to validate continuing tree construction.
//       Implementing a "seen" cache of subtrees would allow early termination in these cases.
export const constructDependencyTree = function (dependencies) {
  let possibleVersions;
  let target;
  let npmPackage;

  for (let [key, value] of Object.entries(dependencies)) {
    npmPackage = queryNpmSource(key);
    possibleVersions = npmPackage.versions;
    target = evaluateRule(value, npmPackage);

    dependencies[key] = {
      "rule": value,
      "target": target,
      "dependencies": {}
    }

    console.log("Key: " + key + ", Rule: " + value + ", Target Version: " + target);

    // Possibility to optimize via a lookup for seen rules/versions here
    // not every subtree will have dependencies
    if (possibleVersions[target].dependencies != null &&
      possibleVersions[target].dependencies != NaN &&
      possibleVersions[target].dependencies != undefined) {
      dependencies[key].dependencies = constructDependencyTree(possibleVersions[target].dependencies);
    }
  }

  return dependencies;
}

// Handling additional checks such as || in defined rule
// Will need some reusable capabilities
// Difficulty in non-standard version evaluation, sorting not available either
// react-is package Example:
//     "16.4.0-alpha.3174632" vs.
//     "16.4.0-alpha.0911da3"
export const evaluateRule = function (rule, npmPackage) {
  let versions = npmPackage.versions
  let matcher = "";
  let target = "";

  // Removes some cases from logic
  if (rule == "" || rule == "*" || rule == "x") {
    return npmPackage["dist-tags"]["latest"];
  }

  // js-tokens allows multiple rules chained: "^3.0.0 || ^4.0.0"
  // trim whitespace for each
  // assumes the highest allowed in the OR based on actual npm behavior
  if (rule.includes("||")) {
    let firstOrArg = rule.split("||")[0].trim();
    let secondOrArg = rule.split("||")[1].trim();
    let firstArr = firstOrArg.split(".");
    let secondArr = firstOrArg.split(".");

    // assumes valid numeric in the first position in NPM
    // comparing major only
    if (parseInt(firstArr[0].replace(/[~\^]/g, "")) > parseInt(secondArr[0].replace(/[~\^]/g, ""))) {
      matcher = firstOrArg;
    } else {
      matcher = secondOrArg;
    }
  } else {
    matcher = rule;
  }

  for (let key in versions.keys()) {
    if (isVersionAcceptable(matcher, key)){
      if (target == "") {
        target = key;
      } else {
        target = compareVersions(key, target);
      }
    }
  }

  return target;
}

export const isVersionAcceptable = function (matcher, version) {
  let position = 0;
  let operator = "any";
  let rule = matcher;
  let matcherParts = matcher.split(".");
  let versionParts = version.split(".");
  const wildCardRegex = /[x\*]/;

  // any version essentially returns true
  if (wildCardRegex.test(matcherParts[0])){
    return true;
  }

  // minor compare
  if (matcher[0] == '^') {
    rule = matcher.substring(1);
    position = 1;
    operator = "gte";
    matcherParts = rule.split(".");
  } else if (wildCardRegex.test(matcherParts[1])) {
    position = 1;
    operator = "gte";
    rule = matcherParts[0] + ".0.0";
    matcherParts = [matcherParts[0], "0", "0"];
  } else if (matcher[0] == '~' ) { // patch compare
    rule = matcher.substring(1);
    position = 2;
    operator = "gte";
    matcherParts = rule.split(".");
  } else if (wildCardRegex.test(matcherParts[2])) {
    position = 2;
    operator = "gte";
    rule = matcherParts[0] + "." + matcherParts[1] + ".0";
    matcherParts = [matcherParts[0], matcherParts[1], "0"];
  } else {
    operator = "eq";
  }

  if (operator == "eq") {
    return matcher == version;
  }

  // console.log("Rule: " + rule + ", Operator: " + operator + ", Position: " + position);

  for (let i = 0; i <= position; i++) {
    // console.log("Current part: " + versionParts[i]);
    // console.log("Matcher value: " + matcherParts[i]);

    if (i == position) {
      if (operator == "gte") {
        return parseInt(versionParts[i]) >= parseInt(matcherParts[i]);
      } else { // any value works
        return true;
      }
    } else if (parseInt(matcherParts[i]) > parseInt(versionParts[i])) {
      return false;
    } else {
      // console.log("vaild version part, continuing: " + versionParts[i]);
    }
  }

  // should never get here, but just in case, fail gracefully
  return false;
}

// assumes actual versions major, minor, patch are numerics only
export const compareVersions = function (possible, currentHighest) {
  const preReleaseLookup = { "alpha": 1, "beta": 2, "rc": 3};
  const versionRegex = /[\s.-]+/;

  let result = "";
  let possibleParts = possible.split(versionRegex);
  let currentHighestParts = currentHighest.split(versionRegex);

  // major
  result = compareVersionInts(possibleParts, possible, currentHighestParts, currentHighest, 0);
  if (result != "") { return result; }

  result = compareVersionInts(possibleParts, possible, currentHighestParts, currentHighest, 1);
  if (result != "") { return result; }

  result = compareVersionInts(possibleParts, possible, currentHighestParts, currentHighest, 2);
  if (result != "") { return result; }

  // if we need to comparate pre-release versions
  if (currentHighestParts.length > 3) {
    if (possibleParts.length == 3 ||
      (possibleParts.length > 3 && preReleaseLookup[possibleParts[3]] > preReleaseLookup[currentHighestParts[3]])) {
       return possible;
    } // else return currentHighest because pre-release is lower than official
  }

  return currentHighest;
}

const compareVersionInts = function (leftArr, leftVal, rightArr, rightVal, index) {
  if (parseInt(leftArr[index]) > parseInt(rightArr[index])) {
    return leftVal;
  } else if (parseInt(leftArr[index]) < parseInt(rightArr[index])) {
    return rightVal;
  } else {
    return "";
  }
}