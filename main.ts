import * as core from "@actions/core";
import * as github from "@actions/github";
import * as dispatch from "@csm-actions/dispatch";
import * as label from "@csm-actions/label";

export type { WorkflowRun } from "@csm-actions/dispatch";

type Inputs = {
  /**
   * An Octokit client authenticated with an installation access token.
   * It needs the `actions:write` permission of the server repository with
   * serverWorkflowRef, or the `issues:write` permission without it.
   */
  octokit?: ReturnType<typeof github.getOctokit>;
  /**
   * An Octokit client authenticated as a GitHub App.
   *
   * It's used to create an installation access token for the server
   * repository, which is revoked once the request is sent.
   * Build it with @octokit/auth-app, passing either a private key or a
   * createJwt callback when the key is stored in a KMS or a HSM.
   */
  appOctokit?: label.Inputs["appOctokit"];
  /**
   * The server workflow to run by a workflow_dispatch event, in the format
   * `<owner>/<repo>/.github/workflows/<workflow file>@<branch or tag>`.
   *
   * When it's set, the server workflow is run by a workflow_dispatch event,
   * which requires the `actions:write` permission of the server repository.
   * Otherwise a label is created in the server repository, which requires the
   * `issues:write` permission.
   */
  serverWorkflowRef?: string;
  /**
   * The server repository name, where a label is created.
   * It can be omitted when serverWorkflowRef is set. If both are set, they must
   * point to the same repository.
   */
  serverRepositoryName?: string;
  /** The server repository owner */
  serverRepositoryOwner?: string;
  owner: string;
  repo: string;
  pullRequestNumber: number;
};

/**
 * Requests the server workflow to update the branch of the pull request.
 *
 * It returns the server workflow run if the server workflow is run by a
 * workflow_dispatch event and GitHub returns the run details.
 */
export const update = async (
  inputs: Inputs,
): Promise<dispatch.WorkflowRun | undefined> => {
  const run = inputs.serverWorkflowRef
    ? await dispatchWorkflow(inputs, inputs.serverWorkflowRef)
    : await createLabel(inputs);
  core.notice(
    `Branch will be updated. Pull request: ${github.context.serverUrl}/${inputs.owner}/${inputs.repo}/pull/${inputs.pullRequestNumber}`,
  );
  return run;
};

const dispatchWorkflow = async (
  inputs: Inputs,
  serverWorkflowRef: string,
): Promise<dispatch.WorkflowRun | undefined> => {
  const workflowRef = dispatch.parseWorkflowRef(serverWorkflowRef);
  if (inputs.serverRepositoryName) {
    dispatch.validateRepository(
      workflowRef,
      inputs.serverRepositoryOwner || workflowRef.owner,
      inputs.serverRepositoryName,
    );
  }
  return await dispatch.dispatch({
    workflowRef,
    inputs: {
      repository_owner: inputs.owner,
      repository_name: inputs.repo,
      pull_request_number: `${inputs.pullRequestNumber}`,
    },
    octokit: inputs.octokit,
    appOctokit: inputs.appOctokit,
  });
};

const createLabel = async (inputs: Inputs): Promise<undefined> => {
  if (!inputs.serverRepositoryName) {
    throw new Error(
      "Either serverRepositoryName or serverWorkflowRef is required",
    );
  }
  if (!inputs.serverRepositoryOwner) {
    throw new Error("serverRepositoryOwner is required");
  }
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
  return undefined;
};
