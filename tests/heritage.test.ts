import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evidenceCitationsFor,
  filterSites,
  retrieve,
  tokenizeForRetrieval,
} from '../lib/heritage/query'

test('L3 or better includes only L1, L2 and L3 interiors', () => {
  const results = filterSites({ maxInteriorLevel: 3 })
  const expected = filterSites({}).filter((site) => site.twin.interiorLevel <= 3)
  assert.deepEqual(results.map((site) => site.id), expected.map((site) => site.id))
  assert.ok(results.every((site) => site.twin.interiorLevel <= 3))
})

test('Unicode retrieval keeps Devanagari, Tamil and Bengali scripts', () => {
  const tokens = tokenizeForRetrieval('निर्माण கட்டிடக்கலை ইতিহাস')
  assert.ok(tokens.includes('निर्माण'))
  assert.ok(tokens.includes('கட்டிடக்கலை'))
  assert.ok(tokens.includes('ইতিহাস'))
  assert.ok(tokens.includes('architecture'))
})

test('Hindi and Tamil queries retrieve grounded evidence', () => {
  assert.ok(retrieve('ताज महल का निर्माण किसने किया?', { siteId: 'site-taj-mahal' }).length > 0)
  assert.ok(retrieve('மாமல்லபுரம் கட்டிடக்கலை', { siteId: 'site-mahabalipuram' }).length > 0)
})

test('stable evidence citations preserve exact source relationships', () => {
  const chunks = retrieve('patron construction', { siteId: 'site-taj-mahal', limit: 3 })
  const mapping = evidenceCitationsFor(chunks)
  assert.equal(mapping.length, chunks.length)
  mapping.forEach((item, index) => {
    assert.equal(item.evidenceId, chunks[index].id)
    assert.deepEqual(item.sourceIds, chunks[index].sourceIds)
    assert.deepEqual(item.sources.map((source) => source.id), chunks[index].sourceIds)
  })
})
