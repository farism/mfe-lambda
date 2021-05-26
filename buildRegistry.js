const AWS = require("aws-sdk");

const s3 = new AWS.S3({ region: "us-east-1" });

const bucketUrl = "https://mfestorage.s3.amazonaws.com";

exports.handler = async (event) => {
  /**
   * get all top level objects
   *
   * response has the following structure
   *
   * {
   *   ...
   *   CommonPrefixes: [
   *     { Prefix: 'app2/' },
   *     { Prefix: 'app3/' },
   *   ]
   * }
   */
  const listResponse = await s3
    .listObjectsV2({
      Bucket: "mfestorage",
      Prefix: "apps/",
      Delimiter: "/",
    })
    .promise();

  /**
   * map over the CommonPrefixes to get an array of micro frontend names
   *
   * ['app2/', 'app3/']
   */
  const prefixes = listResponse.CommonPrefixes.map((cp) => cp.Prefix);

  const manifestPromises = prefixes.map((prefix) => {
    return s3
      .getObject({
        Bucket: "mfestorage",
        Key: `${prefix}master/manifest.json`,
      })
      .promise();
  });

  /**
   * for each micro frontend, request the `manifest.json` file from the `master` branch
   *
   * [<Manifest.json response>, <Manifest.json response>]
   */
  const manifestsResponse = await Promise.all(manifestPromises);

  /**
   * map over each manifest response to generate a module registry entry
   *
   * [
   *  { name: 'app2', path: 'webclient/app2' },
   *  { name: 'app3', path: 'webclient/app3' },
   * ]
   */
  const registry = manifestsResponse.map((res) => {
    const manifest = JSON.parse(res.Body.toString());

    const name = manifest.mfe.name;

    const paths = manifest.mfe.paths;

    const module = manifest.mfe.module;

    const filename = manifest.files[`${name}.js`];

    const url = `${bucketUrl}/apps/${name}/master/${filename}`;

    return {
      name,
      paths,
      url,
      module,
    };
  });

  const registryResponse = await s3
    .putObject({
      Bucket: "mfestorage",
      Key: "module-registry.json",
      Body: JSON.stringify(registry),
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify(registry),
  };
};
