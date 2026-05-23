# Documentation audience policy

The project maintains separate documentation for different audiences.

## Human users

Human user docs explain how to operate the application:

- import data
- inspect import quality
- build a model
- understand function choices
- run a fit
- interpret warnings
- export results

Human user docs should avoid internal implementation details unless needed for transparency.

## Human developers

Human developer docs explain how to work on the project:

- environment setup
- scripts
- tests
- architecture overview
- release process

## Agent developers

Agent developer docs explain how an AI or automation agent should safely modify the project:

- architecture boundaries
- required tests
- compatibility rules
- documentation rules
- known pitfalls
- mistake-learning rules

## Rule

When adding or changing docs, explicitly choose the audience. Do not put all documentation into one README.
