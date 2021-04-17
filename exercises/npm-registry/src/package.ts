import { json, RequestHandler } from 'express';
import got from 'got';
import { NPMPackage } from './types';

/**
 * Attempts to retrieve package data from the npm registry and return it
 */
export const getPackage: RequestHandler = async function (req, res, next) {
  const { name, version } = req.params;

  try {
    const dependencies = queryNpmSource(name)[version].dependencies;

    return res.status(200).json({ name, version, dependencies });
  } catch (error) {
    return next(error);
  }
};

export const queryNpmSource = async function (name) {
  const npmPackage: NPMPackage = await got(
    `https://registry.npmjs.org/${name}`,
  ).json();

  return npmPackage.versions;
}

export const constructDependencyTree = function (dependencies) {
  let possibleVersions;
  let target;

  for (let [key, value] of Object.entries(dependencies)) {
    possibleVersions = queryNpmSource(key);
    target = evaluateRule(value, possibleVersions);

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
export const evaluateRule = function (rule, versions) {
  let target;

  // js-tokens allows multiple rules chained: "^3.0.0 || ^4.0.0"
  if (rule.includes("||")) {
    let passOne = rule.split("||")[0];
    let passTwo = rule.split("||")[1];
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

  for (let [key, value] of Object.entries(versions)) {
 
  }

  return target;
}


