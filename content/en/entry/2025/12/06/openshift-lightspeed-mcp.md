+++
categories = ["OpenShift", "AI"]
date = "2025-12-06T00:00:50+09:00"
description = "Explaining how to extend AI agent capabilities by adding an MCP (Model Context Protocol) server to OpenShift Lightspeed. From local execution with Claude Code to integration with OpenShift Lightspeed."
draft = false
image = "/image/openshift-lightspeed-and-mcp.png"
tags = ["Tech"]
title = "Enhancing AI Agent Capabilities by Adding an MCP Server to OpenShift Lightspeed"
author = "mosuke5"
archive = ["2025"]
+++

Hello, this is Mosuke.
This article is part of the {{< external_link url="https://qiita.com/advent-calendar/2025/openshift" title="OpenShift Advent Calendar 2025" >}}.

I learned that MCP (Model Context Protocol) can be installed on OpenShift Lightspeed (although it is still in Developer Preview), so I decided to try it out immediately.

MCP is also introduced in the following Red Hat article.

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://developers.redhat.com/articles/2025/10/09/integrate-incident-detection-openshift-lightspeed-mcp" target="_blank">
      <img class="belg-site-image" src="https://developers.redhat.com/sites/default/files/styles/article_floated/public/figure2_26.png" />
    </a>
  </div>
  <div class="belg-right col-md-10">
    <div class="belg-title">
      <a href="https://developers.redhat.com/articles/2025/10/09/integrate-incident-detection-openshift-lightspeed-mcp" target="_blank">Integrate incident detection with OpenShift Lightspeed via MCP | Red Hat Developer</a>
    </div>
    <div class="belg-description">Learn how to integrate incident detection with OpenShift Lightspeed, the AI-powered virtual assistant for Red Hat OpenShift</div>
    <div class="belg-site">
      <span class="belg-site-name">developers.redhat.com</span>
    </div>
  </div>
</div>

This time, just following the article wouldn't be very interesting, so I'd like to try installing a different MCP server.
I will be using `kubernetes-mcp-server`.

<div class="belg-link row">
  <div class="belg-left col-md-2 d-none d-md-block">
    <a href="https://github.com/containers/kubernetes-mcp-server" target="_blank">
      <img class="belg-site-image" src="https://github.githubassets.com/favicons/favicon.svg" />
    </a>
  </div>
  <div class="belg-right col-md-10">
    <div class="belg-title">
      <a href="https://github.com/containers/kubernetes-mcp-server" target="_blank">GitHub - containers/kubernetes-mcp-server: Model Context Protocol (MCP) server for Kubernetes and OpenShift</a>
    </div>
    <div class="belg-description">Model Context Protocol (MCP) server for Kubernetes and OpenShift - containers/kubernetes-mcp-server</div>
    <div class="belg-site">
      <img src="https://github.githubassets.com/favicons/favicon.svg" class="belg-site-icon">
      <span class="belg-site-name">GitHub</span>
    </div>
  </div>
</div>

<!--more-->

## First, trying MCP normally

Before integrating it into OpenShift Lightspeed, I'll first verify the operation of the MCP server in my local environment.
The environment is OpenShift 4.19, and I will execute it from Claude Code (claude cli).

Installation is done with the following command.

```bash
$ claude mcp add kubernetes -- npx -y kubernetes-mcp-server@latest
$ claude mcp list
Checking MCP server health...

kubernetes: npx -y kubernetes-mcp-server@latest - ✓ Connected
```

`npx` is a command to temporarily download and execute Node.js packages without installing them.
This means that the MCP server does not run as a resident container or background service, but is launched directly as a process on the local machine when needed. This is very convenient when you want to quickly check the operation locally.

Execution is done from the `claude` CLI.
You don't need to explicitly specify the MCP from the prompt. It infers the MCP to use from the context.

For example, if you ask "List the Pods in the openshift-lightspeed namespace. Display the Pod name, status, and the node it is running on," it will automatically call the `kubernetes-mcp-server` tools and execute it.

```bash
$ claude
> List the Pods in the openshift-lightspeed namespace. Display the Pod name, status, and the node it is running on. 
Here is the list of Pods in the openshift-lightspeed namespace:

  | Pod Name                                               | Status    | Node                      |
  |--------------------------------------------------------|-----------|---------------------------|
  | kubernetes-mcp-server-1-build                          | Completed | worker3.ocp.mosuke5.local |
  | kubernetes-mcp-server-6dd44bd84c-glrd6                 | Running   | worker3.ocp.mosuke5.local |
  | lightspeed-app-server-76f7578674-wkl6n                 | Running   | worker2.ocp.mosuke5.local |
  | lightspeed-console-plugin-67df8f7675-fv8xh             | Running   | worker2.ocp.mosuke5.local |
  | lightspeed-operator-controller-manager-5fb96b455-vxnwl | Running   | worker1.ocp.mosuke5.local |
  | lightspeed-postgres-server-6d59f9b488-79mb7            | Running   | worker2.ocp.mosuke5.local |

  There are a total of 6 Pods, 1 is in Completed state, and the remaining 5 are Running. The workload is distributed across 3 nodes: worker1, worker2, and worker3.
```

## Executing from OpenShift Lightspeed

Now that I've confirmed it works, next is the main topic: executing from OpenShift Lightspeed.

### Deploying the MCP Server

First, deploy `kubernetes-mcp-server` as a container on OpenShift.
A Dockerfile is provided, so you can easily start it up with `oc new-app`.

```bash
$ oc project openshift-lightspeed
$ oc new-app https://github.com/containers/kubernetes-mcp-server
...
$ oc get pod,service
NAME                                                         READY   STATUS      RESTARTS       AGE
pod/kubernetes-mcp-server-1-build                            0/1     Completed   0              103m
pod/kubernetes-mcp-server-6dd44bd84c-glrd6                   1/1     Running     0              92m
...

NAME                                                     TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/kubernetes-mcp-server                            ClusterIP   172.30.96.169    <none>        8080/TCP   92m
...
```

### Granting Permissions

To allow the MCP server to read OpenShift resource information, you need to grant appropriate permissions to the Service Account.
In this case, I will grant `cluster-reader` permissions.

```bash
$ oc adm policy add-cluster-role-to-user cluster-reader -z default -n openshift-lightspeed
```

### Configuring OpenShift Lightspeed

Next, add the settings to use the MCP server on the OpenShift Lightspeed side.
Add the following configuration to the `OLSConfig` resource (or appropriate configuration resource).

```yaml
apiVersion: ols.openshift.io/v1alpha1
kind: OLSConfig
metadata:
  name: cluster
spec:
  # Still a Preview feature
  featureGates:
  - MCPServer

  # MCP Server Configuration
  mcpServers:
  - name: kubernetes-mcp-server
    streamableHTTP:
      enableSSE: true
      headers:
        kubernetes-authorization: kubernetes
      sseReadTimeout: 10
      timeout: 5
      url: http://kubernetes-mcp-server.openshift-lightspeed.svc.cluster.local:8080/sse
  #...
```

Here, I'd like to touch a bit on **SSE (Server-Sent Events)** in the configuration items.
SSE is a mechanism for pushing data from the server to the client. In MCP, it is used to notify the client (in this case, OpenShift Lightspeed) in real-time about events, logs, or the progress of long-running processes occurring on the server side. In this configuration, I have set `enableSSE: true`. `kubernetes-mcp-server` supports SSE, and enabling it allows for a more interactive experience, such as real-time feedback on execution status.

## Actual Use Cases

With the configuration complete, I actually tried using it from the OpenShift Lightspeed chat interface.

**"List the Pods in the openshift-lightspeed namespace. Display the Pod name, status, and the node it is running on"**

To be honest, if you just want to output Pods, it's faster to type the oc command directly, but when it comes to processing that data, using an MCP server enables a more convenient experience.
If you don't use it daily, you tend to forget the fine options...

```bash
List of Pods in openshift-lightspeed (Name / Status / Node):

kubernetes-mcp-server-1-build / Completed / worker3.ocp.mosuke5.local
kubernetes-mcp-server-6dd44bd84c-glrd6 / Running / worker3.ocp.mosuke5.local
lightspeed-app-server-56bbbbf5f5-bth4v / Running / worker2.ocp.mosuke5.local
lightspeed-console-plugin-67df8f7675-fv8xh / Running / worker2.ocp.mosuke5.local
lightspeed-operator-controller-manager-5fb96b455-vxnwl / Running / worker1.ocp.mosuke5.local
lightspeed-postgres-server-6d59f9b488-79mb7 / Running / worker2.ocp.mosuke5.local
```


## Deletion Use Case and Human in the Loop

As the next use case, I will try deleting resources.
I will use the prompt **"Delete the Pod with Label app=test in the openshift-lightspeed namespace"**.

Note that the `cluster-reader` permission granted earlier does not allow deletion. If you want to try this, you need to temporarily grant strong permissions such as `cluster-admin` (though granting broad permissions is scary...).

When I typed it into the prompt, it deleted it, but by default, there was no human confirmation for deletion.
This is very dangerous when giving strong permissions to an AI agent.

So, by instructing it in advance, **"Please always ask for human confirmation when deleting or changing any resources,"** it started to ask for confirmation as follows.

```text
Me) "Delete the Pod with Label app=test in the openshift-lightspeed namespace"
AI)
Deletion requires confirmation, so I will confirm before execution.

Target Pod (1 item, label app=test):

test-676c79db58-qd62f / Running / worker3.ocp.mosuke5.local Owner: ReplicaSet test-676c79db58 (Since it is under this, it may be recreated even if deleted)
What would you like to do?

1. Delete this Pod
2. Scale down Deployment test to replicas=0 first, then delete the Pod
3. Cancel
```

In this way, by placing a buffer (Human in the loop) before dangerous operations, you can use AI agents more safely.

## Summary

I found that adding an MCP server to OpenShift Lightspeed enables operations that are out of reach with standard features alone, as well as integration with custom tools.
I used `kubernetes-mcp-server` this time, but combining it with various other MCP servers seems likely to further advance operational automation and efficiency.

Please try it out yourself.

## Bonus: About the Writing of This Article

Finally, as a bonus, this article was actually written using Google Deepmind's AI agent "Antigravity" and the "Gemini 3 Pro" model behind it.
Regarding the writing style, I had it adjust to bring out the usual "Mosuke-ness" by having it learn from my past articles. Did it feel unnatural? (lol)

Of course, please rest assured that I personally performed the verification work in the article and confirmed the command execution results.
Writing a blog with an AI agent is another interesting new experience.
