import test from 'node:test'
import assert from 'node:assert/strict'
import { SITES } from '../lib/heritage/sites'
import { interiorIdentityConfigFor } from '../lib/twin/interior-identity-config'

test('every monument has a named interior identity in a documented space', () => {
  for (const site of SITES) {
    const identity = interiorIdentityConfigFor(site.slug)
    assert.ok(identity, `${site.slug} is missing an interior identity`)
    assert.ok(identity.label.length > 0, `${site.slug} is missing an identity label`)
    assert.ok(identity.caption.length > 0, `${site.slug} is missing an identity description`)
    assert.ok(
      site.spaces.some((space) => space.id === identity.spaceId),
      `${site.slug} identity points to an unknown interior space`,
    )
  }
})
