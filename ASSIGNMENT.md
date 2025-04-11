# Filestage Assignment
Foremost, thank you for taking the time to do our assignment. We appreciate it! 🤗
We have tried to make the assignment as similar as possible to the work you
would be doing at Filestage. If you enjoy working on this assignment, you will
love working at Filestage.

## What are we looking for?
With this task, we want to see your expertise in action. We are looking to
understand more about:

 - Your hands-on experience coding a single page application
 - Your ability to write high-quality and well-tested code
 - Your ability to work with ambiguous requirements and make decisions
 - Your understanding of the user experience

## What is the deadline?
You have **7 days** since you received the assignment to complete it. On average
it takes **4 hours** to do this assignment.

Best of luck!🍀 If you have any questions, please let us know.

## Introduction
This repository contains a Single Page Application trying to replicate in a
minimal way, our own product. It allows the user to upload files, share them
with reviewer and let reviewers leave comments.
It is composed by two applications that work together: a frontend web app and
a backend HTTP API.

## Frontend
The frontend is a [React](https://react.dev/) application that uses
[MUI](https://mui.com/) as a component library,
[React Router](https://reactrouter.com/) and
[TanStack Query](https://react-query.tanstack.com/) for data fetching.

## Backend
The backend is a [Node.js](https://nodejs.org/) application that uses
[Express](https://expressjs.com/) as a web server,
[MongoDB](https://www.mongodb.com/) as a database and
[Zod](https://zod.dev/) for data validation.

## How to run the project
We've used [Docker](https://www.docker.com/) to make it easier to run the SPA.
So first of all install Docker in your machine. Then you will be able to run
the following commands:
```bash
docker compose up --build --watch
```
This will start the frontend, backend and the database. It will rebuild and
restart as necessary to reflect your changes.
You can access the app at [http://localhost:3000](http://localhost:3000). You
 will need to signup, and then you will be able to create projects, upload
files (only images are supported) and share them with reviewers for them to
leave comments by clicking on the image. Take your time to get familiar with
the application.

## Tests
The `test` folder contains end-to-end tests written using
[Playwright](https://playwright.dev/). Once you have the project running you
can start the tests with the following command:
```bash
npx playwright install
npx playwright test
```

## Formatting and Linting
[ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) have been
setup so you don't need to worry about formatting and linting. it will be
done automatically.
```bash
npm run lint --workspaces
```

## Git
To track your changes and move back to the initial state you can use git.
```bash
git init && git add . && git commit -m "Initial commit"
```

## The Assignment
We have come up with a list of features to implement. You can **choose which
one you would like to do**. As you will see the **feature descriptions are
high-level, open ended and ambiguous on purpose**. We want you to think about
the end user and use your creativity to implement them.

### Feature 1: Comment replies
As a project owner, I would like to reply to comments so that I can have
a conversation with the reviewer.

### Feature 2: Real-time comment updates
As a project owner, I would like the file view to update in real-time
when a reviewer leaves a comment.

### Feature 3: Set a deadline for the review
As a project owner, I would like to set a deadline for the review so that
reviewers are aware of the time frame.

### Feature 4: File versioning
As a collaborator, I would like to upload a new version of a file so that I can
address the reviewer's comments.

### Feature 5: Global search
As a project owner, I would like to search for projects, files and comments
from one central place so I can navigate to them quickly.

### Feature 6: Lazy loading comments
When a file has a lot of comments it is slow to load all of them at once.
Implement infinite scrolling for comments.

### Feature 7: Mentioning users in comments
I would like to easily mention a user while writing a comment so that they
are notified by email.

### Feature 8: Project folders
I would like to organize my projects in folders.

### Feature 9: Annotation tool
As a reviewer when leaving a comment, I would like to draw annotations on the
image so that I can provide more context.

### Feature 10: Linkify URLs in comments
When a URL is included in a comment, it should be a clickable link once the
comment is created.

## Evaluation Criteria
 - Make sure the feature works (remember to test edge cases)
 - Don’t forget backend changes (state should be persisted after refresh)
 - Don’t waste time on CSS or design (leverage the building blocks from Material Design)
 - You are allowed to include new dependencies
 - You are allowed to use AI
 - (bonus) Implement more than one feature
 - (bonus) Production ready: error handling, logging, refactoring and automated tests

## Submission
Create a zip file of the assignment code directory and send it back to us by
email.
If you've started a git repo in the assignment folder you will be able to use:
```bash
npm run archive
```
to create the zip file. In this way the `.gitignore` rules will apply and the
zip will only include code and no `node_modules`.
