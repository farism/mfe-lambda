Lambda function to monitor your S3 bucket and dynamically generate the `module-registry.json` file

Should be configured with an S3 Trigger, with the following details:

- event: Object Creation
- suffix: `/master/manifest.json` - this ensures the manifest is only generated for master branches
