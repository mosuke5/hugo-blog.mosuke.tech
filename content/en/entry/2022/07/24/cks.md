+++
categories = ["Kubernetes", "Certification"]
date = "2022-07-24T11:52:32+09:00"
lastmod = "2022-07-08T16:12:22+09:00"
description = "CKS(Certified Kubernetes Security) passed. How to study?"
draft = false
image = ""
tags = ["Tech"]
title = "CKS passed! How to study?"
author = "mosuke5"
archive = ["2022"]
+++

Hello, this is mosuke.  
I finally took the CKS(Certified Kubernetes Security) and passed. This entry describes the study methods and the testing environment.
<!--more-->

## How to study
### Kubernetes CKS 2022 Complete Course - Theory - Practice
I purchased and studied "<a href="https://px.a8.net/svt/ejp?a8mat=3H3F8L+198YR6+3L4M+BW8O2&a8ejpredirect=https%3A%2F%2Fwww.udemy.com%2Fcourse%2Fcertified-kubernetes-security-specialist%2F" rel="nofollow">Kubernetes CKS 2022 Complete Course - Theory - Practice</a><img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=3H3F8L+198YR6+3L4M+BW8O2" alt="">" by Kim Wüstkamp on Udemy!

To be honest, there does not appear to be any other good material out there besides this. He also provides the Linux Foundation with practice exams, so you can be assured that he covers the exam content. As we will discuss later, the practice exams are also quite similar to the actual questions, and if you can solve the practice exams, you are sure to pass.

One thing to note.  
This course used to come with a practice exam, but now the Udemy course does not.
However, if you sign up for the exam at the Linux Foundation, it will be included in the form of an "Exam Simulator".

![cks-exam-contents](/image/cks-exam-contents-en.png)

### Kubernetes Security Essentials (LFS260)
I also purchased {{< external_link url="https://training.linuxfoundation.org/ja/training/kubernetes-security-essentials-lfs260/" title="Kubernetes Security Essentials (LFS260)" >}} offered by the Linux Foundation. It is cheaper if you buy it bundled with the exam.

There is a lot of content here, too. Almost all of the elements required for the exam are included.

However, the way you learn is different. You will be provided with a PDF text, and **you will need to set up your own Kubernetes environment**, either AWS, GCP, or a Kubernetes environment that you can try out in your own environment.

If you are planning to take the CKS, it should not be too difficult to prepare a Kubernetes environment for learning, but personally, I found it easier to learn in a video format and with the necessary environment set up.

This one has a wider range of content to cover in the Lab (try and learn section). This may be good for those who want **a lot of content to do hands-on work by themselves**.

## Practice exam
As I mentioned before, when you purchase the exam, a practice exam is included.

You can take the practice exam with the same questions up to two times.
When you start the practice test, it counts down to 2 hours, just like the real test, but you can play with it for 36 hours after startup so that you can review.

I took the first one a week before I took the exam, and the second one two days before the exam after reviewing.

## Linux knowledge required more than CKA/CKAD
The thing that I found most different about learning CKS from CKA and CKAD is that it requires more Linux knowledge.
I think CKA and CKAD were more of a Kubernetes exam and the main focus was on how Kubernetes works and how to use it.

The CKS, on the other hand, requires knowledge of the following elements to maintain security on Kubernetes

- Capability
- SELinux
- AppArmor
- Seccomp
- Sytemcalls
- ...

**These are Linux features rather than Kubernetes**.  
I believe that **deepening your knowledge of Linux and the relationship between containers and Linux will bring you closer to passing the exam**.

## Question
This will answer any questions you may have had before taking the exam.

### More difficult than CKA or CKAD?
CKSのホームページには次のように書いてあります。

> A Certified Kubernetes Security Specialist (CKS) is an accomplished Kubernetes practitioner (must be CKA certified) who has demonstrated competence on a broad range of best practices for securing container-based applications and Kubernetes platforms during build, deployment and runtime.

It requires CKA certification and clearly appears to be a higher level qualification.  
So is it a more difficult exam than CKA or CKAD? I thought so, but I don't think so.
Of course, it is about security, so you need to know some things about Kubernetes. It is true that you need the equivalent of CKA certification.  
**As for the difficulty of the exam, I think it is about the same as CKA or CKAD**.

### Is PSP (Pod Security Policy) knowledge really needed?
The PSP is mentioned in the curriculum. It is also mentioned in the learning content presented above.  

On the other hand, **as of Kubernetes 1.23, it is already Depricated and is a feature that will be Removed in 1.25**. Is knowledge of PSP necessary in the current situation? I was wondering. I am sure some of you have the same question.

**The conclusion is that the PSP question was on the exam**.  
It is true that you may not be motivated to learn PSP from now, but I think it is a good idea to learn it while learning the background of PSP depricated. I am sure that this knowledge will be useful in your Kubernetes life in the future.

I am sure that PSP will be out of the curriculum soon, but **I think it is a good idea to learn what is in the curriculum**.

### Specific products (like Falco or Trivy) on the exam?
In the CKS, OSS products such as Falco and Trivy are also included.  
**I wondered if such individual products (OSS) would be included in the questions. I had wondered, but this question was also included.**

Questions such as using Trivy to check for vulnerabilities in container images and how to change the log output of Falco are difficult to solve if you have never used them before.  
**Make sure to actually install and try the software, not just the concepts.**

### What is different about the new PSI Bridge Platform?
There has been {{< external_link title="a change in the exam platform starting June 2022" url="https://training.linuxfoundation.org/ja/bridge-migration-2021/" >}}.
It is only an exam platform, so the exam questions will not change, but there were a few things that seemed to affect you, so I will write them down.

- The exam environment will now take place remotely on a Linux desktop.
  - The Linux desktop will contain a browser and a terminal, which will be used to complete the exam.
  - You will download software called PSI SecureBrowser and perform the exam within that software.
  - **This will not allow you to use your own browser bookmarks.** However, the document URL is written in the exam questions, so there is no need to remember the URL, etc.
  - Because it is a remote desktop, the operating feel is not so good. **It feels sluggish and slow, and you cannot use the shortcuts you are used to using**, so you should be prepared for a slower speed in solving the questions.
  - I had some trouble and it took me about an hour to start the test. Even if everything goes smoothly, it will take about 30 minutes. You should estimate about 2 hours (exam)+ 30~60 minutes (preparation) for the exam.