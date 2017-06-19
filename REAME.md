# linagora.esn.calendar

This repository contains source code of Calendar module for OpenPaaS ESN.

## Install

The current module is activated by default in the OpenPaaS ESN repository. Doing a `npm install` from there will install and enable the calendar module in OpenPaaS.

## Develop

**1. Clone linagora.esn.calendar**

```
git clone git+https://ci.linagora.com/linagora/lgs/openpaas/linagora.esn.calendar.git
cd linagora.esn.calendar
```

**2. Install dependencies and link in OpenPaaS**

*Note: The following instructions assumes that you have already installed OpenPaaS ESN in the path referenced by $ESN below.*

In order to develop, you will have to launch several commands from your favorite terminal:

1. In the current repository, install dependencies with `npm install`
2. In the current repository, create a npm link by using `npm link`
3. In your OpenPaaS ESN repository, link the calendar module

```
cd $ESN
npm link linagora.esn.calendar
```
