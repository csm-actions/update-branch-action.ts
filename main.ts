import * as core from "@actions/core";
import * as github from "@actions/github";
import * as label from "@csm-actions/label";

type Inputs = {
  /** An Octokit client authenticated with an installation access token. */
  octokit?: ReturnType<typeof github.getOctokit>;
  /**
   * An Octokit client authenticated as a GitHub App.
   *
   * It's used to create an installation access token for the server
   * repository, which is revoked once the label is created.
   * Build it with @octokit/auth-app, passing either a private key or a
   * createJwt callback when the key is stored in a KMS or a HSM.
   */
  appOctokit?: label.Inputs["appOctokit"];
  serverRepositoryName: string;
  serverRepositoryOwner: string;
  owner: string;
  repo: string;
  pullRequestNumber: number;
};

export const update = async (inputs: Inputs): Promise<void> => {
  const labelName = label.newName("update-branch-");
  const description =
    `${inputs.owner}/${inputs.repo}/${inputs.pullRequestNumber}`;
  core.info(`creating a label: ${
    JSON.stringify({
      owner: inputs.serverRepositoryOwner,
      repo: inputs.serverRepositoryName,
      label: {
        name: labelName,
        description: description,
      },
    })
  }`);
  await label.create({
    octokit: inputs.octokit,
    appOctokit: inputs.appOctokit,
    owner: inputs.serverRepositoryOwner,
    repo: inputs.serverRepositoryName,
    name: labelName,
    description: description,
  });
  core.notice(
    `Branch will be updated. Pull request: ${github.context.serverUrl}/${inputs.owner}/${inputs.repo}/pull/${inputs.pullRequestNumber}`,
  );
};
