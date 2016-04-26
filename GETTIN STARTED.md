#Simple Instructions for Git Collaboration

##SetUp

1. Set up a Github account: https://github.com/
2. Download Github Desktop (Mac or Windows): https://desktop.github.com/
3. Authenticate to Github:  https://help.github.com/desktop/guides/getting-started/authenticating-to-github

##Usage

Here is a general guide on Git workflow for maximum usability and minimum headaches. While somewhat complicated, adhering to Git best practices can result in good version control.

###Quick Summary: 

0. Don't commit or push to master unless you know nothing will break as a result.
1. Fork new branch from master.
2. Commit work to new branch.
3. Merge back into master when done.

###Details

1. Fork a new Branch: Firstly, make sure your master branch is up to date. In the GUI, this is done by syncing. To fork, in the GUI, click the forking icon next to the branch name in the top right, name your new branch and determine which branch you're forking from. Almost all the time, you'll be forking from master.

2. Commit your work to the feature branch with a neat commit message. This can be done as often as you want, but I'd recommend committing more often rather than less. Version control works best when you have a lot of small changes.

3. When you're done with the feature in question and want to merge it to the master branch: 

* Push your local changes by clicking “sync” on the GUI.
*Open a pull request to merge your feature branch into master. Pull requests let all collaborators in a project know you're basically done with something.
*If there are merge conflicts (Github will tell you), resolve them locally (Github will tell you how) and push to the remote feature branch. This updates the pull request.
