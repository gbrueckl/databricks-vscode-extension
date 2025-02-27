/* eslint-disable @typescript-eslint/naming-convention */

// Code generated from OpenAPI specs by Databricks SDK Generator. DO NOT EDIT.

import {ApiClient} from "../../api-client";
import * as model from "./model";
import Time from "../../retries/Time";
import retry from "../../retries/retries";
import {CancellationToken} from "../../types";
import {ApiError, ApiRetriableError} from "../apiError";
import {context, Context} from "../../context";
import {ExposedLoggers, withLogContext} from "../../logging";
import {Waiter, asWaiter} from "../../wait";

export class ReposRetriableError extends ApiRetriableError {
    constructor(method: string, message?: string) {
        super("Repos", method, message);
    }
}
export class ReposError extends ApiError {
    constructor(method: string, message?: string) {
        super("Repos", method, message);
    }
}

/**
 * The Repos API allows users to manage their git repos. Users can use the API to
 * access all repos that they have manage permissions on.
 *
 * Databricks Repos is a visual Git client in Databricks. It supports common Git
 * operations such a cloning a repository, committing and pushing, pulling,
 * branch management, and visual comparison of diffs when committing.
 *
 * Within Repos you can develop code in notebooks or other files and follow data
 * science and engineering code development best practices using Git for version
 * control, collaboration, and CI/CD.
 */
export class ReposService {
    constructor(readonly client: ApiClient) {}

    @withLogContext(ExposedLoggers.SDK)
    private async _create(
        request: model.CreateRepo,
        @context context?: Context
    ): Promise<model.RepoInfo> {
        const path = "/api/2.0/repos";
        return (await this.client.request(
            path,
            "POST",
            request,
            context
        )) as model.RepoInfo;
    }

    /**
     * Create a repo.
     *
     * Creates a repo in the workspace and links it to the remote Git repo
     * specified. Note that repos created programmatically must be linked to a
     * remote Git repo, unlike repos created in the browser.
     */
    @withLogContext(ExposedLoggers.SDK)
    async create(
        request: model.CreateRepo,
        @context context?: Context
    ): Promise<model.RepoInfo> {
        return await this._create(request, context);
    }

    @withLogContext(ExposedLoggers.SDK)
    private async _delete(
        request: model.Delete,
        @context context?: Context
    ): Promise<model.EmptyResponse> {
        const path = `/api/2.0/repos/${request.repo_id}`;
        return (await this.client.request(
            path,
            "DELETE",
            request,
            context
        )) as model.EmptyResponse;
    }

    /**
     * Delete a repo.
     *
     * Deletes the specified repo.
     */
    @withLogContext(ExposedLoggers.SDK)
    async delete(
        request: model.Delete,
        @context context?: Context
    ): Promise<model.EmptyResponse> {
        return await this._delete(request, context);
    }

    @withLogContext(ExposedLoggers.SDK)
    private async _get(
        request: model.Get,
        @context context?: Context
    ): Promise<model.RepoInfo> {
        const path = `/api/2.0/repos/${request.repo_id}`;
        return (await this.client.request(
            path,
            "GET",
            request,
            context
        )) as model.RepoInfo;
    }

    /**
     * Get a repo.
     *
     * Returns the repo with the given repo ID.
     */
    @withLogContext(ExposedLoggers.SDK)
    async get(
        request: model.Get,
        @context context?: Context
    ): Promise<model.RepoInfo> {
        return await this._get(request, context);
    }

    @withLogContext(ExposedLoggers.SDK)
    private async _list(
        request: model.List,
        @context context?: Context
    ): Promise<model.ListReposResponse> {
        const path = "/api/2.0/repos";
        return (await this.client.request(
            path,
            "GET",
            request,
            context
        )) as model.ListReposResponse;
    }

    /**
     * Get repos.
     *
     * Returns repos that the calling user has Manage permissions on. Results are
     * paginated with each page containing twenty repos.
     */
    @withLogContext(ExposedLoggers.SDK)
    async *list(
        request: model.List,
        @context context?: Context
    ): AsyncIterable<model.RepoInfo> {
        while (true) {
            const response = await this._list(request, context);
            if (
                context?.cancellationToken &&
                context?.cancellationToken.isCancellationRequested
            ) {
                break;
            }

            if (!response.repos || response.repos.length === 0) {
                break;
            }

            for (const v of response.repos) {
                yield v;
            }

            request.next_page_token = response.next_page_token;
            if (!response.next_page_token) {
                break;
            }
        }
    }

    @withLogContext(ExposedLoggers.SDK)
    private async _update(
        request: model.UpdateRepo,
        @context context?: Context
    ): Promise<model.EmptyResponse> {
        const path = `/api/2.0/repos/${request.repo_id}`;
        return (await this.client.request(
            path,
            "PATCH",
            request,
            context
        )) as model.EmptyResponse;
    }

    /**
     * Update a repo.
     *
     * Updates the repo to a different branch or tag, or updates the repo to the
     * latest commit on the same branch.
     */
    @withLogContext(ExposedLoggers.SDK)
    async update(
        request: model.UpdateRepo,
        @context context?: Context
    ): Promise<model.EmptyResponse> {
        return await this._update(request, context);
    }
}
