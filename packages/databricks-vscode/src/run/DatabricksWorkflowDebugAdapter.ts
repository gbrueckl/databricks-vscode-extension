/**
 * Debug adapter for running code as workflows on Databricks.
 */

import {
    ExitedEvent,
    InitializedEvent,
    LoggingDebugSession,
    TerminatedEvent,
} from "@vscode/debugadapter";
import {
    CancellationTokenSource,
    DebugAdapterDescriptor,
    DebugAdapterDescriptorFactory,
    DebugAdapterInlineImplementation,
    Disposable,
    ExtensionContext,
    ProviderResult,
    window,
} from "vscode";
import {DebugProtocol} from "@vscode/debugprotocol";
import {ConnectionManager} from "../configuration/ConnectionManager";
import {Subject} from "./Subject";
import {WorkflowRunner} from "./WorkflowRunner";
import {promptForClusterAttach, promptForClusterStart} from "./prompts";
import {CodeSynchronizer} from "../sync/CodeSynchronizer";
import {LocalUri} from "../sync/SyncDestination";
import {WorkspaceFsAccessVerifier} from "../workspace-fs";
import {isNotebook} from "../utils";

/**
 * This interface describes the mock-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the mock-debug extension.
 * The interface should always match this schema.
 */
interface ILaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    /** An absolute path to the "program" to debug. */
    program: string;

    /** Command line arguments */
    parameters?: Record<string, string>;

    /** Command line arguments */
    args?: string[];
}

export class DatabricksWorkflowDebugAdapterFactory
    implements DebugAdapterDescriptorFactory, Disposable
{
    private workflowRunner: WorkflowRunner;

    constructor(
        private connection: ConnectionManager,
        private wsfsAccessVerifier: WorkspaceFsAccessVerifier,
        context: ExtensionContext,
        codeSynchronizer: CodeSynchronizer
    ) {
        this.workflowRunner = new WorkflowRunner(
            context,
            codeSynchronizer,
            connection
        );
    }

    dispose() {
        this.workflowRunner.dispose();
    }

    createDebugAdapterDescriptor(): ProviderResult<DebugAdapterDescriptor> {
        return new DebugAdapterInlineImplementation(
            new DatabricksWorkflowDebugSession(
                this.connection,
                this.workflowRunner,
                this.wsfsAccessVerifier
            )
        );
    }
}

export class DatabricksWorkflowDebugSession extends LoggingDebugSession {
    private _configurationDone = new Subject();
    private tokenSource = new CancellationTokenSource();
    private token = this.tokenSource.token;

    constructor(
        private connection: ConnectionManager,
        private workflowRunner: WorkflowRunner,
        private wsfsAccessVerifier: WorkspaceFsAccessVerifier
    ) {
        super();
    }

    /**
     * The 'initialize' request is the first request called by the frontend
     * to interrogate the features the debug adapter provides.
     */
    protected initializeRequest(
        response: DebugProtocol.InitializeResponse,
        args: DebugProtocol.InitializeRequestArguments
    ): void {
        args.supportsProgressReporting = true;
        response.body = response.body || {};

        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsCancelRequest = true;
        response.body.supportTerminateDebuggee = true;
        this.sendResponse(response);

        // since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
        // we request them early by sending an 'initializeRequest' to the frontend.
        // The frontend will end the configuration sequence by calling 'configurationDone' request.
        this.sendEvent(new InitializedEvent());
    }

    /**
     * Called at the end of the configuration sequence.
     * Indicates that all breakpoints etc. have been sent to the DA and that the 'launch' can start.
     */
    protected configurationDoneRequest(
        response: DebugProtocol.ConfigurationDoneResponse,
        args: DebugProtocol.ConfigurationDoneArguments
    ): void {
        super.configurationDoneRequest(response, args);

        // notify the launchRequest that configuration has finished
        this._configurationDone.notify();
    }

    protected async disconnectRequest(): Promise<void> {
        this.tokenSource.cancel();
    }

    protected async attachRequest(
        response: DebugProtocol.AttachResponse,
        args: ILaunchRequestArguments
    ) {
        return this.launchRequest(response, args);
    }

    protected async launchRequest(
        response: DebugProtocol.LaunchResponse,
        args: ILaunchRequestArguments
    ) {
        // wait 1 second until configuration has finished (and configurationDoneRequest has been called)
        await this._configurationDone.wait(1000);

        // start the program in the runtime
        await this.startWorkflow(
            args.program,
            args.parameters || {},
            args.args || []
        );
        this.sendEvent(new TerminatedEvent());
        this.sendResponse(response);
    }

    /**
     * Start executing the given program.
     */
    private async startWorkflow(
        program: string,
        parameters: Record<string, string>,
        args: Array<string>
    ): Promise<void> {
        if (
            !(await isNotebook(new LocalUri(program))) &&
            !program.endsWith(".py")
        ) {
            return this.onError("Only Python files can be run as a workflow");
        }

        if (this.connection.state === "CONNECTING") {
            await this.connection.waitForConnect();
        }

        const cluster = this.connection.cluster;
        const workspaceClient = this.connection.workspaceClient;

        if (!cluster || !workspaceClient) {
            promptForClusterAttach();
            return this.onError();
        }
        const syncDestination = this.connection.syncDestinationMapper;
        if (!syncDestination) {
            return this.onError(
                "You must configure code synchronization to run on Databricks"
            );
        }

        await cluster.refresh();
        await this.wsfsAccessVerifier.verifyCluster(cluster);
        await this.wsfsAccessVerifier.verifyWorkspaceConfigs();
        if (!["RUNNING", "RESIZING"].includes(cluster.state)) {
            promptForClusterStart();
            return this.onError();
        }

        await this.workflowRunner.run({
            program: new LocalUri(program),
            parameters,
            args,
            cluster,
            syncDestination: syncDestination,
            token: this.token,
        });
    }

    private onError(errorMessage?: string) {
        if (errorMessage) {
            window.showErrorMessage(errorMessage);
        }
        this.sendEvent(new ExitedEvent(1));
        this.sendEvent(new TerminatedEvent());
    }
}
