const core = require('@actions/core')

async function run() {
    try {
        core.info('TBD')
    } catch (error) {
        core.setFailed(error.message)
    }
}

run()
