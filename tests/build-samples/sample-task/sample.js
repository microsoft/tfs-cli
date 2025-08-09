const tl = require('azure-pipelines-task-lib/task');

function run() {
    try {
        const message = tl.getInput('message', true);
        const workingDirectory = tl.getPathInput('workingDirectory', false);

        if (workingDirectory) {
            tl.checkPath(workingDirectory, 'workingDirectory');
            tl.cd(workingDirectory);
        }

        console.log(`Sample Task: ${message}`);
        tl.setResult(tl.TaskResult.Succeeded, 'Task completed successfully');
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();
