const Consul = require('consul')

function getConsul(options) {
    const opt = {
        host: options.host || 'localhost',
        port: parseInt(options.port, 10) || 8500,
        secure: options.secure || false,
        defaults: {
            recurse: options.recurse || false
        }
    }

    if (options.ca) {
        opt.ca = [options.ca]
    }
    if (options.dc) {
        opt.defaults.dc = options.dc
    }
    if (options.token) {
        opt.defaults.token = options.token
    }

    return new Consul(opt)
}

async function hasValueChanged(consul, key, target) {
    const result = await consul.kv.get(key)

    if (!result) {
        return {changed: true}
    }

    return {changed: result.Value !== target, index: result.ModifyIndex}
}

function putValueByPath(valueObj, key, separator, value) {
    const path = key.split(separator)
    let topObj = valueObj

    for (const attr of path.slice(0, -1)) {
        if (!Object.prototype.hasOwnProperty.call(topObj, attr)) {
            topObj[attr] = {}
        }
        topObj = topObj[attr]
    }

    topObj[path.slice(-1)] = value
}

async function getValue(options, key, recurse = false) {
    const consul = getConsul(options)
    const result = await consul.kv.get({key, recurse})

    if (!result) {
        return {changed: false}
    }

    if (Array.isArray(result)) {
        let re = new RegExp(`^${key}/?`, 'u')
        let value = {}

        for (const item of result) {
            const trimmedKey = item.Key.replace(re, '')
            putValueByPath(value, trimmedKey, '/', item.Value)
        }

        return {changed: false, data: value}
    }

    return {changed: false, data: result.Value, flags: result.Flags, index: result.ModifyIndex}
}

async function setValue(options, key, value, retrieve = true) {
    const consul = getConsul(options)
    const {changed, index} = await hasValueChanged(consul, key, value)

    if (changed) {
        await consul.kv.set(key, value)
    }

    if (retrieve) {
        const result = await consul.kv.get(key)
        return {changed: changed, data: result.Value, flags: result.Flags, index: result.ModifyIndex}
    }

    const ret = {changed: changed}
    if (index) {
        ret.index = index
    }

    return ret
}

async function removeValue(options, key, recurse = false) {
    const consul = getConsul(options)
    const ret = {changed: false}

    if (recurse) {
        const list = await consul.kv.keys(key)
        ret.changed = !!list.length
    } else {
        const result = await consul.kv.get(key)
        if (result) {
            ret.changed = true
            ret.data = result.Value
            ret.index = result.ModifyIndex
        }
    }

    if (ret.changed) {
        await consul.kv.del({key, recurse})
    }

    return ret
}

async function lockKey(options, session, key, value, lock, cas = null) {
    const opt = {key, value}
    const consul = getConsul(options)
    let {changed, index} = await hasValueChanged(consul, key, value)

    if (lock) {
        opt.acquire = session
    } else {
        opt.release = session
    }

    if (cas !== null) {
        opt.cas = cas
    }

    if (!lock && index) {
        changed = true
    }

    if (changed) {
        const result = await consul.kv.set(opt)
        changed = lock ? !!result : true
        if (lock && result && !index) {
            const info = await consul.kv.get(key)
            if (info) {
                index = info.ModifyIndex
            }
        }
    }

    if (index) {
        return {changed, index}
    }

    return {changed}
}

module.exports = {
    hasValueChanged,
    getValue,
    setValue,
    removeValue,
    lockKey,
}
