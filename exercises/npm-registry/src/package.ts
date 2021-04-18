import { json, RequestHandler } from 'express';
import got from 'got';
import { NPMPackage } from './types';

/**
 * Attempts to retrieve package data from the npm registry and return it
 */
export const getPackage: RequestHandler = async function (req, res, next) {
  const { name, version } = req.params;

  try {
    const dependencies = (await queryNpmSource(name)).versions[version].dependencies;

    const results = constructDependencyTree(dependencies);
    return res.status(200).json({ name, version, results });
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
      "rule": key,
      "target": target,
      "dependencies": {}
    }

    // Possibility to optimize via a lookup for seen rules/versions here
    if (possibleVersions[target].dependencies != null &&
      possibleVersions[target].dependencies != NaN) {
      dependencies[key].dependencies = constructDependencyTree(possibleVersions[target].dependencies);
    }
  }

  return dependencies;
}

// Handling additional checks such as || or && in defined rule
// Will need some reusable capabilities
// Difficulty in non-standard version evaluation
// react-is Example: "16.4.0-alpha.3174632",
//                   "16.4.0-alpha.0911da3"
export const evaluateRule = function (rule, npmPackage) {
  const regex = /[0-9]/g;
  let target;
  let versions = npmPackage.versions

  let evaluator;
  let major = "";
  let minor = "";
  let patch = "";
  let operand = "";

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
    firstOrArg[0].match(regex)
  }

  // determine major, minor, patch
  if (rule[0] == '~') {

  } else if (rule[0] == '^') {

  } else if (rule.includes("x") || rule.includes("*")) {
    // anything after this point
  } else if (rule == "") {
    // latest version
  } else {
    // exact match only
  }

  // determine pre-release version checks
  if (rule.split("-")[1].includes("alpha")) {

  } else if (rule.split("-")[1].includes("beta")) {

  } else if (rule.split("-")[1].includes("rc")) {

  }

  // for (let key in versions) {

  // }

  return target;
}

// assumes actual versions major, minor, patch are numerics only
export const compareVersions = function (possible, currentHighest) {
  const versionRegex = /[\s.-]+/;
  const preReleaseLookup = { "alpha": 1, "beta": 2, "rc": 3};

  let possibleParts = possible.split(versionRegex);
  let currentHighestParts = currentHighest.split(versionRegex);

  // major
  if (parseInt(possibleParts[0]) > parseInt(currentHighestParts[0])) {
    return possible;
  }

  // minor
  if (parseInt(possibleParts[1]) > parseInt(currentHighestParts[1])) {
    return possible;
  }

  // patch
  if (parseInt(possibleParts[2]) > parseInt(currentHighestParts[2])) {
    return possible;
  }

  // if we need to comparate pre-release versions
  if (possibleParts.length > 2) {
    if (currentHighestParts.length > 2 &&
      preReleaseLookup[possibleParts[3]] > preReleaseLookup[currentHighestParts[3]]) {
       return possible;
    } // else return currentHighest because pre-release is lower than official
  }

  // current highest is a pre-release while new possible is not
  if (currentHighestParts.length > 2) {
    return possible;
  }

  return currentHighest;
}


