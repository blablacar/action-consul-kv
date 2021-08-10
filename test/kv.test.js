const Consul = require('consul')
const kv = require('../lib/kv')

describe('kv', () => {
    let consul
    let path

    beforeAll(async () => {
        consul = new Consul()
        path = `test_${Math.floor(Math.random() * 100000)}`
        await consul.kv.del({key: path, recurse: true})
    })
    afterEach(async () => {
        await consul.kv.del({key: path, recurse: true})
    })

    describe('test getValue()', () => {
        test('value not existing', async () => {
            const result = await kv.getValue({}, `${path}/test000`)
            expect(result).toMatchObject({changed: false})
            expect(result).not.toHaveProperty('data')
        })
        test('value exist', async () => {
            await consul.kv.set(`${path}/test010`, 'foo')
            const result = await kv.getValue({}, `${path}/test010`)
            expect(result).toMatchObject({changed: false, data: 'foo'})
            expect(result).toHaveProperty('flags')
            expect(result).toHaveProperty('index')
        })
        test('recurse values', async () => {
            await consul.kv.set(`${path}/test020/a`, 'AAA')
            await consul.kv.set(`${path}/TEST020/b`, 'BBB')
            await consul.kv.set(`${path}/test020/c/d`, 'DDD')
            await consul.kv.set(`${path}/test020/c/e/f`, 'FFF')
            const result = await kv.getValue({}, `${path}/test020`, true)
            expect(result).toMatchObject({changed: false, data: {a: 'AAA', c: {d: 'DDD', e: {f: 'FFF'}}}})
        })
        test('recurse values with separator at end', async () => {
            await consul.kv.set(`${path}/test021/a`, 'AAA')
            await consul.kv.set(`${path}/test021/c/d`, 'CCC')
            const result = await kv.getValue({}, `${path}/test021/`, true)
            expect(result).toMatchObject({changed: false, data: {a: 'AAA', c: {d: 'CCC'}}})
        })
        test('without recursion', async () => {
            await consul.kv.set(`${path}/test022/a`, 'AAA')
            await consul.kv.set(`${path}/test022/c/d`, 'CCC')
            const result = await kv.getValue({}, `${path}/test022`)
            expect(result).toMatchObject({changed: false})
            expect(result).not.toHaveProperty('data')
        })
    })

    describe('test setValue()', () => {
        test('new k/v', async () => {
            const result = await kv.setValue({}, `${path}/test100`, 'foo')
            const target = await consul.kv.get(`${path}/test100`)
            expect(result).toMatchObject({changed: true, data: 'foo'})
            expect(result).toHaveProperty('flags')
            expect(result).toHaveProperty('index')
            expect(target.Value).toEqual('foo')
        })
        test('new k/v without retrieve', async () => {
            const result = await kv.setValue({}, `${path}/test101`, 'foo', false)
            const target = await consul.kv.get(`${path}/test101`)
            expect(result).toEqual({changed: true})
            expect(result).not.toHaveProperty('index')
            expect(target.Value).toEqual('foo')
        })
        test('update value', async () => {
            await consul.kv.set(`${path}/test110`, 'foo')
            const result = await kv.setValue({}, `${path}/test110`, 'bar')
            const target = await consul.kv.get(`${path}/test110`)
            expect(result).toMatchObject({changed: true, data: 'bar'})
            expect(result).toHaveProperty('flags')
            expect(result).toHaveProperty('index')
            expect(target.Value).toEqual('bar')
        })
        test('update value without retrieve', async () => {
            await consul.kv.set(`${path}/test111`, 'foo')
            const result = await kv.setValue({}, `${path}/test111`, 'bar', false)
            const target = await consul.kv.get(`${path}/test111`)
            expect(result).toMatchObject({changed: true})
            expect(result).not.toHaveProperty('flags')
            expect(result).toHaveProperty('index')
            expect(target.Value).toEqual('bar')
        })
        test('existing value', async () => {
            await consul.kv.set(`${path}/test120`, 'bar')
            const result = await kv.setValue({}, `${path}/test120`, 'bar')
            const target = await consul.kv.get(`${path}/test120`)
            expect(result).toMatchObject({changed: false, data: 'bar'})
            expect(result).toHaveProperty('flags')
            expect(result).toHaveProperty('index')
            expect(target.Value).toEqual('bar')
        })
        test('existing value without retrieve', async () => {
            await consul.kv.set(`${path}/test121`, 'bar')
            const result = await kv.setValue({}, `${path}/test121`, 'bar', false)
            const target = await consul.kv.get(`${path}/test121`)
            expect(result).toMatchObject({changed: false})
            expect(result).not.toHaveProperty('flags')
            expect(result).toHaveProperty('index')
            expect(target.Value).toEqual('bar')
        })
    })

    describe('test removeValue()', () => {
        test('key not existing', async () => {
            const result = await kv.removeValue({}, `${path}/test200`)
            const target = await consul.kv.get(`${path}/test200`)
            expect(result).toEqual({changed: false})
            expect(target).not.toBeDefined()
        })
        test('key exist', async () => {
            await consul.kv.set(`${path}/test210`, 'foo')
            const result = await kv.removeValue({}, `${path}/test210`)
            const target = await consul.kv.get(`${path}/test210`)
            expect(result).toMatchObject({changed: true, data: 'foo'})
            expect(result).toHaveProperty('index')
            expect(target).not.toBeDefined()
        })
        test('key exist with recurse', async () => {
            await consul.kv.set(`${path}/test211`, 'foo')
            const result = await kv.removeValue({}, `${path}/test211`, true)
            const target = await consul.kv.get(`${path}/test211`)
            expect(result).toMatchObject({changed: true})
            expect(result).not.toHaveProperty('index')
            expect(target).not.toBeDefined()
        })
        test('key is tree', async () => {
            await consul.kv.set(`${path}/test220/a`, 'foo')
            await consul.kv.set(`${path}/test220/b`, 'bar')
            const result = await kv.removeValue({}, `${path}/test220`)
            const targetA = await consul.kv.get(`${path}/test220/a`)
            const targetB = await consul.kv.get(`${path}/test220/b`)
            expect(result).toEqual({changed: false})
            expect(targetA).toBeDefined()
            expect(targetB).toBeDefined()
        })
        test('key is tree with recurse', async () => {
            await consul.kv.set(`${path}/test221/a`, 'foo')
            await consul.kv.set(`${path}/test221/b`, 'bar')
            const result = await kv.removeValue({}, `${path}/test221`, true)
            const targetA = await consul.kv.get(`${path}/test221/a`)
            const targetB = await consul.kv.get(`${path}/test221/b`)
            expect(result).toEqual({changed: true})
            expect(targetA).not.toBeDefined()
            expect(targetB).not.toBeDefined()
        })
    })

    describe('test lockKey()', () => {
        let session1
        let session2

        beforeEach(async () => {
            const result1 = await consul.session.create({lockdelay: '30s', ttl: '60s'})
            const result2 = await consul.session.create({lockdelay: '30s', ttl: '60s'})
            session1 = result1.ID
            session2 = result2.ID
        })
        afterEach(async () => {
            await consul.session.destroy(session1)
            await consul.session.destroy(session2)
        })

        test('acquire', async () => {
            const result = await kv.lockKey({}, session1, `${path}/test300`, session1, true)
            const target = await consul.kv.get(`${path}/test300`)
            expect(result).toMatchObject({changed: true})
            expect(result).toHaveProperty('index')
            expect(target.Value).toEqual(session1)
            expect(target.Session).toEqual(session1)
        })
        test('acquire/release', async () => {
            const result1 = await kv.lockKey({}, session1, `${path}/test310`, session1, true)
            const target1 = await consul.kv.get(`${path}/test310`)
            const result2 = await kv.lockKey({}, session1, `${path}/test310`, session1, false)
            const target2 = await consul.kv.get(`${path}/test310`)
            expect(result1).toMatchObject({changed: true})
            expect(result1).toHaveProperty('index')
            expect(result2).toMatchObject({changed: true})
            expect(target1).toBeDefined()
            expect(target1).toHaveProperty('Session')
            expect(target2).toBeDefined()
            expect(target2).not.toHaveProperty('Session')
        })
        test('lock key', async () => {
            const result1 = await kv.lockKey({}, session1, `${path}/test320`, session1, true)
            const target1 = await consul.kv.get(`${path}/test320`)
            const result2 = await kv.lockKey({}, session2, `${path}/test320`, session2, true)
            const target2 = await consul.kv.get(`${path}/test320`)
            const result3 = await kv.lockKey({}, session1, `${path}/test320`, session1, false)
            const result4 = await kv.lockKey({}, session2, `${path}/test320`, session2, true)
            const target3 = await consul.kv.get(`${path}/test320`)
            const result5 = await kv.lockKey({}, session2, `${path}/test320`, null, false)
            const target4 = await consul.kv.get(`${path}/test320`)
            expect(result1).toMatchObject({changed: true})
            expect(result2).toMatchObject({changed: false})
            expect(result3).toMatchObject({changed: true})
            expect(result4).toMatchObject({changed: true})
            expect(result5).toMatchObject({changed: true})
            expect(target1.Session).toEqual(session1)
            expect(target2.Session).toEqual(session1)
            expect(target3.Session).toEqual(session2)
            expect(target4).not.toHaveProperty('Session')
        })
    })
})
