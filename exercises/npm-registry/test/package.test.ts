import * as getPort from 'get-port';
import got from 'got';
import { Server } from 'http';
import { createApp } from '../src/app';
import { evaluateRule, compareVersions, isVersionAcceptable } from '../src/package';

describe('/package/:name/:version endpoint', () => {
  let server: Server;
  let port: number;

  beforeAll(async (done) => {
    port = await getPort();
    server = createApp().listen(port, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('responds js-tokens', async () => {
    const packageName = 'js-tokens';
    const packageVersion = '4.0.0';

    const res: any = await got(
      `http://localhost:${port}/package/${packageName}/${packageVersion}`,
    ).json();

    expect(res.name).toEqual(packageName);
  });

  it('returns advanced dependencies', async () => {
    const packageName = 'react';
    const packageVersion = '16.13.0';

    const res: any = await got(
      `http://localhost:${port}/package/${packageName}/${packageVersion}`,
    ).json();

    expect(res).toEqual({
        "name": "react",
        "version": "16.13.0",
        "dependencies": {
          "loose-envify":  {
            "target": "^1.1.0",
            "version": "1.4.0",
            "dependencies": {
              "js-tokens": {
                "target": "^3.0.0 || ^4.0.0",
                "version": "4.0.0",
                "dependencies": {},
              }
            }
          },
          "object-assign": {
            "target": "^4.1.1",
            "version": "4.1.1",
            "dependencies": {},
          },
          "prop-types": {
            "target": "^15.6.2",
            "version": "15.7.2",
            "dependencies": {
              "loose-envify":  {
                "target": "^1.1.0",
                "version": "1.4.0",
                "dependencies": {
                  "js-tokens": {
                    "target": "^3.0.0 || ^4.0.0",
                    "version": "4.0.0",
                    "dependencies": {}
                  }
                }
              },
              "object-assign": {
                "target": "^4.1.1",
                "version": "4.1.1",
                "dependencies": {}
              },
              "react-is": {
                "target": "^16.8.1",
                "version": "16.8.6",
                "dependencies": {}
              }
            },
          },
        }
    });
  });
});

describe ('compareVersions function', () => {
  it('returns the release version instead of pre-release',  () => {
    let preRelease = "16.4.0-alpha.3174632";
    let release = "16.4.0";

    expect(compareVersions(release, preRelease)).toEqual(release);
  });

  it('returns the higher prerelease version',  () => {
    let preRelease = "16.4.0-alpha.3174632";
    let release = "16.4.0-rc.0";

    expect(compareVersions(release, preRelease)).toEqual(release);
  });

  it('returns the higher original major version',  () => {
    let original = "16.4.1";
    let release = "15.5.0";

    expect(compareVersions(release, original)).toEqual(original);
  });

  it('returns the higher original minor version',  () => {
    let original = "16.4.1";
    let release = "16.3.2";

    expect(compareVersions(release, original)).toEqual(original);
  });

  it('returns the higher original patch version',  () => {
    let original = "16.4.1";
    let release = "16.4.0-alpha";

    expect(compareVersions(release, original)).toEqual(original);
  });


  it('returns the higher original version not pre-release',  () => {
    let original = "16.4.1";
    let release = "16.4.1-alpha";

    expect(compareVersions(release, original)).toEqual(original);
  });

  it('returns the higher patch version',  () => {
    let preRelease = "16.4.0-alpha.3174632";
    let release = "16.4.1-alpha.0";

    expect(compareVersions(release, preRelease)).toEqual(release);
  });

  it('returns the higher minor version',  () => {
    let preRelease = "16.4.0-alpha.3174632";
    let release = "16.5.0-alpha.0";

    expect(compareVersions(release, preRelease)).toEqual(release);
  });

  it('returns the higher major version',  () => {
    let preRelease = "16.4.0-alpha.3174632";
    let release = "17.4.0-alpha.0";

    expect(compareVersions(release, preRelease)).toEqual(release);
  });
});

describe('isVersionAcceptable function', () => {
  it('returns true for equal versions',  () => {
    let matcher = "16.4.0";

    expect(isVersionAcceptable(matcher, matcher)).toEqual(true);
  });

  it('returns false for unequal versions',  () => {
    let preRelease = "16.4.0-alpha.3174632";
    let matcher = "16.4.0";

    expect(isVersionAcceptable(matcher, preRelease)).toEqual(false);
  });

  it('returns false for lower major versions',  () => {
    let matcher = "^16.5.0";
    let version = "15.6.0";

    expect(isVersionAcceptable(matcher, version)).toEqual(false);
  });

  it('returns false for lower minor versions',  () => {
    let matcher = "~16.6.0";
    let version = "16.5.2";

    expect(isVersionAcceptable(matcher, version)).toEqual(false);
  });

  it('returns true for gte patch versions',  () => {
    let matcher = "~16.4.2";
    let version = "16.4.5";

    expect(isVersionAcceptable(matcher, version)).toEqual(true);
  });

  it('returns true for gte minor versions',  () => {
    let matcher = "^16.4.0";
    let version = "16.6.5";

    expect(isVersionAcceptable(matcher, version)).toEqual(true);
  });

  it('returns true for any minor versions with wildcard x',  () => {
    let matcher = "16.x.0";
    let version = "16.6.5";

    expect(isVersionAcceptable(matcher, version)).toEqual(true);
  });

  it('returns true for any minor versions with wildcard *',  () => {
    let matcher = "16.*.0";
    let version = "16.6.5";

    expect(isVersionAcceptable(matcher, version)).toEqual(true);
  });

  it('returns true for any patch versions with wildcard *',  () => {
    let matcher = "16.6.*";
    let version = "16.6.5";

    expect(isVersionAcceptable(matcher, version)).toEqual(true);
  });

  it('returns the true for any patch versions with wildcard x',  () => {
    let matcher = "16.6.x";
    let version = "16.6.5";

    expect(isVersionAcceptable(matcher, version)).toEqual(true);
  });
});