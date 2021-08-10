const {getValue, setValue, removeValue, lockKey} = require('./kv')

async function run(core) {
    const state = core.getInput('state', {required: true})
    const key = core.getInput('key', {required: true})
    const value = core.getInput('value')
    const host = core.getInput('host', {required: true})
    const port = core.getInput('port', {required: true})
    const scheme = core.getInput('scheme', {required: true})
    const ca = core.getInput('ca')
    const dc = core.getInput('dc')
    const token = core.getInput('token')
    const recurse = core.getInput('recurse')
    const retrieve = core.getInput('retrieve')
    const session = core.getInput('session')
    const cas = core.getInput('cas')

    const options = {
        host,
        port,
        secure: scheme === 'https',
        ca: ca !== '' ? ca : null,
        dc: dc !== '' ? dc : null,
        token: token !== '' ? token : null,
    }
    const args = {
        key,
        value,
        recurse: recurse === 'true',
        retrieve: retrieve === 'true',
        session,
        cas: cas !== '' ? cas : null,
    }

    let result
    try {
        result = await execute(state, options, args)
    } catch (error) {
        core.setFailed(error.message)
    }

    output(core, result, 'changed')
    output(core, result, 'data')
    output(core, result, 'flags')
    output(core, result, 'index')
}

function output(core, src, property) {
    if (!Object.prototype.hasOwnProperty.call(src, property)) {
        return
    }

    core.setOutput(property, src[property])
    core.info(`Set ${property}: ${JSON.stringify(src[property])}`)
}

async function execute(state, options, args) {
    if (state === 'acquire') {
        if (!args.session) {
            throw new Error(`${state} of lock for ${args.key} requested but no session supplied`)
        }
        return await lockKey(options, args.session, args.key, args.value, true, args.cas)
    }

    if (state === 'release') {
        if (!args.session) {
            throw new Error(`${state} of lock for ${args.key} requested but no session supplied`)
        }
        return await lockKey(options, args.session, args.key, args.value, false, args.cas)
    }

    if (state === 'present') {
        if (args.value === '') {
            return await getValue(options, args.key, args.recurse)
        }

        return await setValue(options, args.key, args.value, args.retrieve)
    }

    if (state === 'absent') {
        return await removeValue(options, args.key, args.recurse)
    }

    throw new Error(`Unsupported state: ${state}`)
}

module.exports = {
    execute,
    run
}
