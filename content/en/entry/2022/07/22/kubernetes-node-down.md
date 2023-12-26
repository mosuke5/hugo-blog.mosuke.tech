+++
categories = ["Kubernetes"]
date = "2022-07-22T00:13:19+09:00"
description = "This blog provides a detailed explanation of how pods work when a Kubernetes node fails."
draft = false
image = ""
tags = ["Tech"]
title = "Pod behavior during Kubernetes node failure"
author = "mosuke5"
archive = ["2022"]
+++

([Original Japanese text](https://blog.mosuke.tech/entry/2021/03/11/kubernetes-node-down/))

Hello, this is mosuke.  
Today, I would like to confirm the behavior of pods when a node failure occurs in Kubernetes.
Until now, I had an incorrect understanding of pod behavior and scheduling in the event of node failure.
I am ashamed to admit it, but I would like to explain what I have confirmed for those who have the same misconceptions.
<!--more-->

## Overview
First of all, let me explain the situation: let's say we have 3 Worker nodes and an application is running.

If Worker#1 shuts down, kubelet stops, network communication fails, etc., what happens to the pods running on top of it? This is what we are talking about.
In my mind, it would be like, "Well, it will be moved to another node to maintain the number of replicas! But in reality, it is not that simple.
We will see how it works in the case of Deployment and the case of StatefulSet.

![node-down-overview](/image/kubernetes-node-down-overview-en.png)

## What happens when you shut down a node
*This section describes the events. Explanations of the events are described later in this section.  

When I shutdown a node or stop kubelet, the status of Node becomes `NotReady`.
We currently have a cluster running with 3 Master nodes and 3 Worker nodes. In this blog, we don't need to care about the Master node, so we will only retrieve the Worker when we run `kubectl get node`.

```text
$ kubectl get node --selector='node-role.kubernetes.io/worker'
NAME                                              STATUS   ROLES    AGE     VERSION
ip-10-0-163-234.ap-southeast-1.compute.internal   Ready    worker   9m6s    v1.19.0+8d12420
ip-10-0-168-85.ap-southeast-1.compute.internal    Ready    worker   18h     v1.19.0+8d12420
ip-10-0-184-189.ap-southeast-1.compute.internal   Ready    worker   9m28s   v1.19.0+8d12420
```

Also, start Nginx Deployment with Replicas=3. The node where the pod is running is important. Check it carefully.  
One Pod on `ip-10-0-184-189.ap-southeast-1.compute.internal` (henceforth `ip-10-0-184-189`).  
The other two pod are running on `ip-10-0-163-234.ap-southeast-1.compute.internal` (henceforth `ip-10-0-163-234`).

```text
$ kubectl create deployment nginx --image=nginxinc/nginx-unprivileged:1.19 --replicas=3
deployment.apps/nginx created

$ kubectl get pod -o wide
NAME                     READY   STATUS    RESTARTS   AGE   IP            NODE                                              NOMINATED NODE   READINESS GATES
nginx-5998485d44-44bsh   1/1     Running   0          32s   10.131.0.7    ip-10-0-184-189.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-gg8h9   1/1     Running   0          32s   10.128.2.12   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-xcxpl   1/1     Running   0          32s   10.128.2.13   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>           <none>

$ kubectl get deploy
NAME    READY   UP-TO-DATE   AVAILABLE   AGE
nginx   3/3     3            3           73s
```

Now we will shut down the node ip-10-0-184-189, which has one Pod running. After that, note the status of the Node and the movement of the Pod.

```text
$ ssh ip-10-0-184-189.ap-southeast-1.compute.internal
node# shutdown -h now

// One minute later, ip-10-0-184-189 became NotReady status.
$ kubectl get node --selector='node-role.kubernetes.io/worker' -w
NAME                                              STATUS   ROLES    AGE   VERSION
ip-10-0-163-234.ap-southeast-1.compute.internal   Ready     worker   22m   v1.19.0+8d12420
ip-10-0-168-85.ap-southeast-1.compute.internal    Ready     worker   18h   v1.19.0+8d12420
ip-10-0-184-189.ap-southeast-1.compute.internal   NotReady  worker   23m   v1.19.0+8d12420
```

Let's check the state of the Pod at this time.  
The node is shut down, but the pod (nginx-5998485d44-44bsh) is still running. I try to access this pod with curl, but of course it does not return any response.

```text
$ kubectl get pod -o wide
NAME                     READY   STATUS    RESTARTS   AGE   IP            NODE                                              NOMINATED NODE   READINESS GATES
nginx-5998485d44-44bsh   1/1     Running   0          10m   10.131.0.7    ip-10-0-184-189.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-gg8h9   1/1     Running   0          10m   10.128.2.12   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>           <none>
nginx-5998485d44-xcxpl   1/1     Running   0          10m   10.128.2.13   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>           <none>

// Connect to Nginx on the shutdown node by IP address.
// Ofcource connection was failed.
$ kubectl exec nginx-5998485d44-gg8h9 -- curl -I http://10.131.0.7:8080/
curl: (7) Failed to connect to 10.131.0.7 port 8080: No route to host
command terminated with exit code 7

// Confirm that other nginx pods are accessible
$ kubectl exec nginx-5998485d44-gg8h9 -- curl -I http://10.128.2.13:8080/
HTTP/1.1 200
Server: nginx/1.19.8
Date: Sat, 13 Mar 2021 05:29:51 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Tue, 09 Mar 2021 15:27:51 GMT
Connection: keep-alive
ETag: "604793f7-264"
Accept-Ranges: bytes
```

I'll give a detailed explanation later, but let's move on.  
After 5 minutes, a change occurred. The `nginx-5998485d44-44bsh` running on shutdown node became `Terminating` and a new `nginx-5998485d44-84zkg` was created on other node.  
`nginx-5998485d44-44bsh` continues to remain `Terminating` status.

```text
$ kubectl get node -o wide
NAME                     READY   STATUS        RESTARTS   AGE   IP            NODE                                              NOMINATED NODE   READINESS GATES
nginx-5998485d44-44bsh   1/1     Terminating   0          14m   10.131.0.7    ip-10-0-184-189.ap-southeast-1.compute.internal   <none>      <none>
nginx-5998485d44-84zkg   1/1     Running       0          8s    10.128.2.24   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>      <none>
nginx-5998485d44-gg8h9   1/1     Running       0          14m   10.128.2.12   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>      <none>
nginx-5998485d44-xcxpl   1/1     Running       0          14m   10.128.2.13   ip-10-0-163-234.ap-southeast-1.compute.internal   <none>      <none>
```

## Detailed Explanation
It is time to explain. Did you understand what happened?  
As soon as the node was shut down, the pods on the node were not rescheduled.

After shutting down a node, node_lifecycle_controller (one of the functions of the Kubernetes control plane) detects that Kubelet no longer updates Node information and changes the Node Status to `NotReady`.  
At this time, a Taint of `key: node.kubernetes.io/unreachable` is given to the node at the same time.

[monitorNodeHealth() in node_licecycle_controller.go](https://github.com/kubernetes/kubernetes/blob/release-1.19/pkg/controller/nodelifecycle/node_lifecycle_controller.go#L759) is responsible for this process.

```text
$ kubectl describe node ip-10-0-184-189.ap-southeast-1.compute.internal
...
Taints:             node.kubernetes.io/unreachable:NoExecute
                    node.kubernetes.io/unreachable:NoSchedule
...
```

In Kubernetes, the [DefaultTolerationSeconds](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#defaulttolerationseconds) Admission Controller works by default, so when a pod is created, it is assigned the following tolerations.

```text
$ kubectl get pod -o yaml anypod
...
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
```

The `tolerationSeconds` given by DefaultTolerationSeconds is set to 300 seconds by default, and if the node is not recovered after 300 seconds (Taint is not removed from the node), the pod is evicted and scheduled to another node.

Therefore, the pod was not rescheduled for 5 minutes (300 seconds) after the node shutdown.

By the way, `-tolerationSeconds` can be specified as an option when starting kube-apiserver. It can be set with `--default-not-ready-toleration-seconds`, `--default-unreachable-toleration-seconds`. Check [this document](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/) for details.

## Why Pod has been Running for a while
After 5 minutes, I moved to another node, during which time the Pod remained `Running`.
I accessed the Pod with Curl and received no response, but why was it Running?
I think this is because Kubelet is stopped.
Normally, Kubelet updates the status of a pod, but since Kubelet was stopped due to the node shutdown, it was not possible to update the status of the pod.

## Why Pod remained Terminating
After 5 minutes, the status of the Pod changed to `Terminating` and another Pod was started.
However, the Pod remains `Terminating`. After some time has passed, the Pod status remains and does not disappear.
I think this is also because Kubelet is not running, after the Pod is deleted, Kubelet terminates it as a process, but since it is not running, it is stuck in the status of waiting for Kubelet's confirmation.
There are several ways to resolve this issue, such as forcibly deleting the pod or deleting the Node object.

## When Node is restored in a short time
What if Node can be recovered in a short time?  
For example, restart instead of shutdown. If the node recovers within 5 minutes (`tolerationSeconds`), the `key: node.kubernetes.io/unreachable` taint is removed and the pod is restarted without being evicted.
The pod will be restarted without being evicted. So it will keep running on the same node.  

Suppose you set the `tolerationSeconds` to an extremely short value. For example, 1 second. Even if the node is restarted or there is a temporary node failure, the Pod will move to another node. On the other hand, it is a trade-off because it increases the possibility of Pods being biased to some nodes. Let`s wake up with sufficient caution.


## Considerations when using StatefulSet
The previous examples used Nginx Deployment, but if you are using StatefulSet, there is another point to consider: Deployment, unlike StatefulSet, does not require strictness regarding the number of Pod replicas.

If one Pod becomes Terminating, it can launch other Pods, but StatefulSet, as stated in [the official documentation](https://kubernetes.io/docs/tasks/run-application/force-delete-stateful-set-pod/), `StatefulSet ensures that, at any time, there is at most one Pod with a given identity running in a cluster.`. In other words, a Pod cannot be created until it is confirmed that it has been completely deleted, even if it is in Terminating status.

> In normal operation of a StatefulSet, there is never a need to force delete a StatefulSet Pod. The StatefulSet controller is responsible for creating, scaling and deleting members of the StatefulSet. It tries to ensure that the specified number of Pods from ordinal 0 through N-1 are alive and ready. StatefulSet ensures that, at any time, there is at most one Pod with a given identity running in a cluster. This is referred to as at most one semantics provided by a StatefulSet.

The following is also described in the official documentation as a way to resolve a pod stuck in Terminating in a StatefulSet.
For example, you can force delete by `kubectl delete pod xxxx --force` to reschedule at worst even if the node is unrecoverable.

- The Node object is deleted (either by you, or by the Node Controller).
- The kubelet on the unresponsive Node starts responding, kills the Pod and removes the entry from the apiserver.
- Force deletion of the Pod by the user.

## If the Pod is deleted before the tolerationSeconds is reached
As we have seen, the reason why the Pod is not rescheduled after shutting down the Node is that the status of the Pod is not changed by Kubelet.
If you are using Deployment instead of StatefulSet and your application is stateless, you can choose to remove the Pod before waiting a tolerationSecond to deal with the problem.

## When a node object is deleted
What happens if we delete the node object from Kubernetes instead of shutting down the node?  
If you delete the node object with `kubectl delete node worker-xxxx` or similar, the pod will be rescheduled quickly because there is no waiting for the node/Kubelet to recover as we have seen before.

## Summary
We have seen the behavior of a Kubernetes Worker node when it stops and fails.
In Kubernetes, just because a node is stopped does not mean that the pods running on it will be immediately rescheduled to another node; this is not the same behavior as when a pod is deleted, so be very careful.

In production operations, it is necessary to fully consider what to do when a node goes down.
The approach will differ depending on whether you are using Deployment or StatefulSet, the type of workloads you are using, and the availability of storage. It is important to have a proper understanding of the dynamics.
