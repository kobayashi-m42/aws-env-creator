import { AwsRegion } from "../../src/AwsRegion";
import { createEnvFile, EnvFileType } from "../../src/createEnvfile";
import fs from "fs";
import readline from "readline";
import InvalidFileTypeError from "../../src/error/InvalidFileTypeError";
import AWS from "aws-sdk-mock";
import path from "path";

describe("createEnvFile.unitTest", () => {
  beforeEach(() => {
    AWS.setSDK(path.resolve("node_modules/aws-sdk"));
  });

  afterEach(() => {
    AWS.restore("SecretsManager", "getSecretValue");
  });

  it("should be able to create a .env", async () => {
    const mockResponse = (params: { SecretId: string }, callback: any) => {
      callback(null, {
        SecretString: JSON.stringify({
          SECRET_ID: params.SecretId,
          ANOTHER_API_KEY: "another_api_key",
          ANOTHER_API_SECRET: "another_api_secret"
        })
      });
    };

    AWS.mock("SecretsManager", "getSecretValue", mockResponse);

    const params = {
      type: EnvFileType.dotenv,
      outputDir: "./",
      secretId: "dev/app",
      profile: "nekochans-dev",
      region: AwsRegion.ap_northeast_1
    };

    await createEnvFile(params);

    const stream = fs.createReadStream("./.env");
    const reader = readline.createInterface({ input: stream });

    const expected = [
      "SECRET_ID=dev/app",
      "ANOTHER_API_KEY=another_api_key",
      "ANOTHER_API_SECRET=another_api_secret"
    ];

    reader.on("line", (data: string) => {
      expect(expected.includes(data)).toBeTruthy();
    });
  });

  it("will be InvalidFileTypeError", async () => {
    const params = {
      type: "unknown",
      outputDir: "./",
      secretId: "dev/app",
      profile: "nekochans-dev",
      region: AwsRegion.ap_northeast_1
    };

    await createEnvFile(params)
      .then(() => {
        fail();
      })
      .catch((error: InvalidFileTypeError) => {
        expect(error.message).toBe("It's a file type that is not allowed");
        expect(error.name).toBe("InvalidFileTypeError");
      });
  });
});
