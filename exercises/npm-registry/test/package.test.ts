import * as getPort from 'get-port';
import got from 'got';
import { Server } from 'http';
import { createApp } from '../src/app';
import { evaluateRule, compareVersions } from '../src/package';

// describe('/package/:name/:version endpoint', () => {
//   let server: Server;
//   let port: number;

//   beforeAll(async (done) => {
//     port = await getPort();
//     server = createApp().listen(port, done);
//   });

//   afterAll((done) => {
//     server.close(done);
//   });

//   it('responds', async () => {
//     const packageName = 'react';
//     const packageVersion = '16.13.0';

//     const res: any = await got(
//       `http://localhost:${port}/package/${packageName}/${packageVersion}`,
//     ).json();

//     expect(res.name).toEqual(packageName);
//   });

//   it('returns dependencies', async () => {
//     const packageName = 'react';
//     const packageVersion = '16.13.0';

//     const res: any = await got(
//       `http://localhost:${port}/package/${packageName}/${packageVersion}`,
//     ).json();

//     expect(res.dependencies).toEqual({
//       'loose-envify': '^1.1.0',
//       'object-assign': '^4.1.1',
//       'prop-types': '^15.6.2',
//     });
//   });
// });

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