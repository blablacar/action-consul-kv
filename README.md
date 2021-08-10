# GitHub Action: Manipulate entries in the key/value store of a Consul cluster

Allows the retrieval, addition, modification and deletion of key/value entries in a Consul cluster via the agent or server.
The entire contents of the record, including the indices, flags and session are returned as `value`.

When a value is removed, the existing value if any is returned as part of the results.
This behavior is valid for non-recursive deletion.

See [KV Store](https://www.consul.io/api-docs/kv) for more details.

## Example usage

```yml
- name: Set value
  uses: levonet/action-consul-kv@master
  with:
    key: foo
    value: bar

- name: Get value
  id: consul
  uses: levonet/action-consul-kv@master
  with:
    key: foo

- run: echo ${{ steps.consul.outputs.data }}  # bar
```

## Inputs

### `state`

The action to take with the supplied key and value.
If the state is `present` and `value` is set, the key contents will be set to the value supplied and `changed`
will be set to `true` only if the value was different to the current contents.
If the state is `present` and `value` is not set, the existing value associated to the key will be returned.

The state `absent` will remove the key/value pair, again 'changed' will be set to true only
if the key actually existed prior to the removal.

An attempt can be made to obtain or free the lock associated with a key/value pair with the states `acquire`
or attempt changed will be true if the attempt is successful, false otherwise.

Possible values are `present`, `absent`, `acquire` and `release` (`acquire` and `release` are experimental).

Default: `present`.

### `key`

**Required** The key at which the value should be stored.

### `value`

The value should be associated with the given key, required if `state` is `present`.

### `host`

Host of the consul agent.

Default: `localhost`

### `port`

The port on which the consul agent is running.

Default: `8500`

### `scheme`

The protocol scheme on which the consul agent is running.

Default: `http`

### `ca`

Optional.
Trusted certificates in PEM format.

### `dc`

Optional.
The datacenter that this agent will communicate with. By default the datacenter of the host is used.

### `token`

Optional.
The token key identifying an ACL rule set that controls access to the key value pair.

### `recurse`

If the key represents a prefix, each entry with the prefix can be retrieved by setting this to `true`.

Default: `false`

### `retrieve`

If the `state` is `present` and `value` is set, perform a read after setting the value and return this value.

Default: `true`

### `session`

Experimental.
The session that should be used to acquire or release a lock associated with a key/value pair.

### `cas`

Experimental.
Used when acquiring a lock with a session. If the `cas` is `0`, then Consul will only put the key if it does not already exist.
If the `cas` value is non-zero, then the key is only set if the index matches the ModifyIndex of that key.

## Outputs

### `changed`

Returns `true` if the key or key value has been changed.

### `data`

A string label to differentiate this status from the status of other systems.
For recursive requests, contains a serialized object with k/v.

Optional, returned if the key exists.

### `flags`

Flags opaque to user, can be used by application.
Optional.

### `index`

ModifyIndex to block and wait for changes.
Optional.

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
