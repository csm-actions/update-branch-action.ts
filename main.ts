import * as core from "@actions/core";
import * as github from "@actions/github";
import * as label from "@csm-actions/label";

type Inputs = {
  appID?: string;
  appPrivateKey?: string;
  octokit?: ReturnType<typeof github.getOctokit>;
  serverRepositoryName: string;
  serverRepositoryOwner: string;
  owner: string;
  repo: string;
  pullRequestNumber: number;
};

export const update = async (inputs: Inputs) => {
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
    appId: inputs.appID,
    privateKey: inputs.appPrivateKey,
    octokit: inputs.octokit,
    owner: inputs.serverRepositoryOwner,
    repo: inputs.serverRepositoryName,
    name: labelName,
    description: description,
  });
  core.notice(
    `Branches will be updated. Please check the server workflow: ${github.context.serverUrl}/${inputs.serverRepositoryOwner}/${inputs.serverRepositoryName}/actions`,
  );
};
