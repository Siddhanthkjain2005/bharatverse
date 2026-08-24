'use client'

/**
 * Site scatter, fortification envelope and Red Fort-specific contextual massing.
 *
 * The Red Fort is rendered as a palace-fort rather than as a generic monument:
 * an elongated/chamfered defensive enclosure, Lahori Gate, Chhatta Chowk,
 * Naubat Khana, Diwan-i-Am and a river-facing line of private palace pavilions
 * connected by the Nahr-i-Behisht.
 */

import { useMemo } from 'react'

import {
  UNIT_BOX,
  UNIT_CYL,
  UNIT_ROCK,
  UNIT_ROCK_HI,
  box,
  cylinder,
} from '@/lib/twin/geometry'
import type { WorldModel } from '@/lib/twin/model'
import { Rand } from '@/lib/twin/rng'

import { Course, CourseLines, Parapet } from '../detail/bands'
import { Chattri } from '../detail/crowns'
import { InstancedSet, type Inst } from '../detail/instanced'
import type { TwinMaterials } from '../use-twin-materials'

function RedFortComplex({
  world,
  mats,
}: {
  world: WorldModel
  mats: TwinMaterials
}) {
  const { m, pick } = mats
  const rect = world.env.boundaryRect
  if (!rect) return null

  const red = pick(m.accent, 'CONTEXTUAL')
  const sandstone = pick(m.stoneAlt, 'CONTEXTUAL')
  const marble = pick(m.stoneAlt, 'CONTEXTUAL')
  const dark = pick(m.dark, 'CONTEXTUAL')

  const w = Math.max(112, rect.w)
  const d = Math.max(72, rect.d)
  const wallH = 9.5
  const wallT = 2.6
  const chamfer = 14
  const gateW = 16

  const wall = (
    key: string,
    x: number,
    z: number,
    length: number,
    angle: number,
  ) => (
    <group key={key}>
      <mesh
        position={[x, wallH / 2, z]}
        rotation={[0, angle, 0]}
        geometry={box(length, wallH, wallT, m.tile)}
        material={red}
        castShadow
        receiveShadow
      />
      <CourseLines
        cx={x}
        cz={z}
        w={angle === 0 ? length : wallT}
        d={angle === 0 ? wallT : length}
        y0={0}
        y1={wallH - 0.6}
        spacing={1.15}
        project={0.06}
        material={dark}
      />
      <Course
        cx={x}
        cz={z}
        w={angle === 0 ? length : wallT}
        d={angle === 0 ? wallT : length}
        y={wallH - 0.28}
        h={0.36}
        project={0.22}
        t={0.5}
        material={sandstone}
      />
      <Parapet
        cx={x}
        cz={z}
        w={angle === 0 ? length - 0.4 : wallT - 0.4}
        d={angle === 0 ? wallT + 0.4 : length + 0.4}
        y={wallH}
        material={sandstone}
        unit={0.65}
        h={0.55}
      />
    </group>
  )

  const diagonalLength = Math.sqrt(2) * chamfer
  const halfW = w / 2
  const halfD = d / 2
  const sideWallLength = halfW - chamfer - gateW / 2
  const sideWallOffset = gateW / 2 + sideWallLength / 2

  const walls = (
    <>
      {wall('front-left', -sideWallOffset, halfD, sideWallLength, 0)}
      {wall('front-right', sideWallOffset, halfD, sideWallLength, 0)}
      {wall('rear', 0, -halfD, w - chamfer * 2, 0)}
      {wall('left', -halfW, 0, d - chamfer * 2, Math.PI / 2)}
      {wall('right', halfW, 0, d - chamfer * 2, Math.PI / 2)}
      {wall(
        'nw-chamfer',
        -halfW + chamfer / 2,
        halfD - chamfer / 2,
        diagonalLength,
        Math.PI / 4,
      )}
      {wall(
        'ne-chamfer',
        halfW - chamfer / 2,
        halfD - chamfer / 2,
        diagonalLength,
        -Math.PI / 4,
      )}
      {wall(
        'sw-chamfer',
        -halfW + chamfer / 2,
        -halfD + chamfer / 2,
        diagonalLength,
        -Math.PI / 4,
      )}
      {wall(
        'se-chamfer',
        halfW - chamfer / 2,
        -halfD + chamfer / 2,
        diagonalLength,
        Math.PI / 4,
      )}
    </>
  )

  const bastion = (
    key: string,
    x: number,
    z: number,
    radius: number,
    height: number,
  ) => (
    <group key={key}>
      <mesh
        position={[x, height / 2, z]}
        geometry={cylinder(radius, radius * 1.05, height, 24, m.tile)}
        material={red}
        castShadow
        receiveShadow
      />
      <Course
        cx={x}
        cz={z}
        w={radius * 1.8}
        d={radius * 1.8}
        y={height - 0.35}
        h={0.32}
        project={0.2}
        t={0.5}
        material={sandstone}
      />
      <Chattri
        radius={radius * 0.82}
        height={radius * 1.05}
        position={[x, height + 0.05, z]}
        material={marble}
        trim={dark}
      />
    </group>
  )

  const bastions = (
    <>
      {bastion('b-nw', -halfW + chamfer * 0.52, halfD - chamfer * 0.52, 4.7, 12)}
      {bastion('b-ne', halfW - chamfer * 0.52, halfD - chamfer * 0.52, 4.7, 12)}
      {bastion('b-sw', -halfW + chamfer * 0.52, -halfD + chamfer * 0.52, 4.7, 12)}
      {bastion('b-se', halfW - chamfer * 0.52, -halfD + chamfer * 0.52, 4.7, 12)}
      {bastion('b-gate-l', -gateW / 2 - 5.1, halfD + 0.2, 3.5, 11)}
      {bastion('b-gate-r', gateW / 2 + 5.1, halfD + 0.2, 3.5, 11)}
    </>
  )

  const gateTowerW = 8.2
  const gateTowerD = 6.8
  const gateH = 15.5
  const gateZ = halfD - 1.0
  const gateGap = 15.5

  const lahoriGate = (
    <group>
      {[-1, 1].map((side) => (
        <group key={`gate-tower-${side}`}>
          <mesh
            position={[
              side * (gateGap / 2 + gateTowerW / 2),
              gateH / 2,
              gateZ,
            ]}
            geometry={box(gateTowerW, gateH, gateTowerD, m.tile)}
            material={red}
            castShadow
            receiveShadow
          />
          <CourseLines
            cx={side * (gateGap / 2 + gateTowerW / 2)}
            cz={gateZ}
            w={gateTowerW}
            d={gateTowerD}
            y0={0}
            y1={gateH - 0.7}
            spacing={1.05}
            project={0.07}
            material={dark}
          />
          <Parapet
            cx={side * (gateGap / 2 + gateTowerW / 2)}
            cz={gateZ}
            w={gateTowerW + 0.5}
            d={gateTowerD + 0.5}
            y={gateH}
            material={marble}
            unit={0.7}
            h={0.6}
          />
          <Chattri
            radius={2.55}
            height={3.4}
            position={[
              side * (gateGap / 2 + gateTowerW / 2),
              gateH + 0.5,
              gateZ,
            ]}
            material={marble}
            trim={dark}
          />
        </group>
      ))}

      <mesh
        position={[0, gateH * 0.73, gateZ]}
        geometry={box(
          gateGap + gateTowerW * 1.7,
          gateH * 0.43,
          gateTowerD * 0.75,
          m.tile,
        )}
        material={red}
        castShadow
        receiveShadow
      />

      <mesh
        position={[0, gateH * 0.34, gateZ - gateTowerD * 0.52]}
        geometry={box(gateGap * 0.78, gateH * 0.6, 0.28, m.tile)}
        material={dark}
      />

      <mesh
        position={[0, gateH * 0.31, gateZ - gateTowerD * 0.54]}
        geometry={box(gateGap * 0.54, gateH * 0.43, 0.12, m.tile)}
        material={m.dark}
      />

      {Array.from({ length: 7 }).map((_, i) => {
        const x = -gateGap * 0.42 + (gateGap * 0.84 * i) / 6
        return (
          <Chattri
            key={`gate-chhatri-${i}`}
            radius={0.8}
            height={1.15}
            position={[x, gateH * 1.03, gateZ - 0.05]}
            material={marble}
            trim={dark}
          />
        )
      })}

      {[-1, 1].map((side) => (
        <group key={`gate-minaret-${side}`}>
          <mesh
            position={[side * (gateGap * 0.48), gateH + 1.65, gateZ - 0.05]}
            geometry={cylinder(0.34, 0.3, 3.2, 12, m.tile)}
            material={marble}
          />
          <mesh
            position={[side * (gateGap * 0.48), gateH + 3.45, gateZ - 0.05]}
            geometry={cylinder(0.58, 0.18, 0.5, 12, m.tile)}
            material={marble}
          />
        </group>
      ))}
    </group>
  )

  const chowkZ = 23.0
  const chowkW = 28
  const chowkD = 11
  const chowkH = 5.0

  const chowk = (
    <group>
      <mesh
        position={[0, chowkH / 2, chowkZ]}
        geometry={box(chowkW, chowkH, chowkD, m.tile)}
        material={red}
        castShadow
      />
      <mesh
        position={[0, chowkH + 0.25, chowkZ]}
        geometry={box(chowkW + 0.8, 0.5, chowkD + 0.8, m.tile)}
        material={marble}
        castShadow
      />
      {Array.from({ length: 16 }).map((_, i) => {
        const x = -chowkW / 2 + 1.1 + ((chowkW - 2.2) * i) / 15
        return (
          <mesh
            key={`shop-${i}`}
            position={[x, chowkH * 0.42, chowkZ - chowkD / 2 - 0.15]}
            geometry={box(1.1, chowkH * 0.48, 0.45, m.tile)}
            material={marble}
          />
        )
      })}
    </group>
  )

  const naubatZ = 17.0
  const naubatW = 31
  const naubatD = 7
  const naubatH = 8.5

  const naubat = (
    <group>
      <mesh
        position={[0, naubatH / 2, naubatZ]}
        geometry={box(naubatW, naubatH, naubatD, m.tile)}
        material={red}
        castShadow
      />
      <Course
        cx={0}
        cz={naubatZ}
        w={naubatW + 0.5}
        d={naubatD + 0.5}
        y={naubatH - 0.35}
        h={0.35}
        project={0.24}
        t={0.5}
        material={marble}
      />
      <mesh
        position={[0, naubatH * 0.52, naubatZ - naubatD / 2 - 0.18]}
        geometry={box(naubatW * 0.56, naubatH * 0.42, 0.3, m.tile)}
        material={dark}
      />
    </group>
  )

  const diwanZ = 8.0
  const diwanW = 45
  const diwanD = 10
  const diwanH = 4.8

  const diwan = (
    <group>
      <mesh
        position={[0, 0.65, diwanZ]}
        geometry={box(diwanW + 4, 1.3, diwanD + 4, m.tile)}
        material={red}
        castShadow
      />

      {Array.from({ length: 10 }).map((_, i) => {
        const x = -diwanW / 2 + (diwanW * i) / 9
        return (
          <mesh
            key={`diwan-col-${i}`}
            position={[x, 0.65 + diwanH / 2, diwanZ - diwanD / 2]}
            geometry={cylinder(0.42, 0.34, diwanH, 12, m.tile)}
            material={marble}
            castShadow
          />
        )
      })}

      {Array.from({ length: 10 }).map((_, i) => {
        const x = -diwanW / 2 + (diwanW * i) / 9
        return (
          <mesh
            key={`diwan-col-back-${i}`}
            position={[x, 0.65 + diwanH / 2, diwanZ + diwanD / 2]}
            geometry={cylinder(0.42, 0.34, diwanH, 12, m.tile)}
            material={marble}
            castShadow
          />
        )
      })}

      <mesh
        position={[0, 0.65 + diwanH, diwanZ]}
        geometry={box(diwanW + 1.2, 0.55, diwanD + 1.2, m.tile)}
        material={marble}
        castShadow
      />

      <mesh
        position={[0, 2.4, diwanZ + diwanD / 2 + 0.35]}
        geometry={box(5.2, 3.4, 0.5, m.tile)}
        material={marble}
        castShadow
      />
    </group>
  )

  const palaceX = w * 0.29
  const palaceZs = [-7, -15, -23, -31]

  const palace = (
    <group>
      {palaceZs.map((z, i) => {
        const pw = i === 1 ? 15 : i === 2 ? 18 : 13
        const pd = 6.8
        const ph = i === 2 ? 4.6 : 4.0

        return (
          <group key={`palace-${i}`}>
            <mesh
              position={[palaceX, ph / 2 + 0.3, z]}
              geometry={box(pw, ph, pd, m.tile)}
              material={marble}
              castShadow
              receiveShadow
            />
            <Course
              cx={palaceX}
              cz={z}
              w={pw + 0.5}
              d={pd + 0.5}
              y={ph + 0.05}
              h={0.35}
              project={0.2}
              t={0.5}
              material={marble}
            />
            {[-1, 1].map((side) => (
              <Chattri
                key={`pavilion-chhatri-${i}-${side}`}
                radius={Math.min(1.2, pw * 0.1)}
                height={1.8}
                position={[palaceX + side * (pw / 2 - 1.1), ph + 0.5, z]}
                material={marble}
                trim={dark}
              />
            ))}
          </group>
        )
      })}

      <mesh
        position={[palaceX, 0.18, -19]}
        geometry={box(1.05, 0.16, 31, m.tile)}
        material={dark}
      />

      {[-27, -19, -11, -3].map((z) => (
        <mesh
          key={`basin-${z}`}
          position={[palaceX, 0.28, z]}
          geometry={box(2.7, 0.2, 2.7, m.tile)}
          material={marble}
        />
      ))}

      <group position={[w * 0.38, 0, -31]}>
        <mesh
          position={[0, 4.2, 0]}
          geometry={cylinder(3.0, 3.2, 8.4, 16, m.tile)}
          material={marble}
          castShadow
        />
        <Chattri
          radius={2.2}
          height={2.8}
          position={[0, 8.7, 0]}
          material={marble}
          trim={dark}
        />
      </group>

      <mesh
        position={[palaceX + 6.5, 2.0, -15]}
        geometry={cylinder(2.1, 2.4, 4, 8, m.tile)}
        material={marble}
        castShadow
      />
    </group>
  )

  const garden = (
    <group>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => {
          const x = sx * w * 0.22
          const z = -17 + sz * 9

          return (
            <group key={`garden-${sx}-${sz}`} position={[x, 0, z]}>
              <mesh
                position={[0, 0.12, 0]}
                geometry={box(13, 0.16, 13, m.tile)}
                material={dark}
              />
              <mesh
                position={[0, 0.3, 0]}
                geometry={box(0.8, 0.3, 13, m.tile)}
                material={marble}
              />
              <mesh
                position={[0, 0.3, 0]}
                geometry={box(13, 0.3, 0.8, m.tile)}
                material={marble}
              />
              <Chattri
                radius={1.15}
                height={1.5}
                position={[0, 1.2, 0]}
                material={marble}
                trim={dark}
              />
            </group>
          )
        }),
      )}
    </group>
  )

  return (
    <group>
      {walls}
      {bastions}
      {lahoriGate}
      {chowk}
      {naubat}
      {diwan}
      {palace}
      {garden}
    </group>
  )
}

export function SiteScatter({
  world,
  mats,
}: {
  world: WorldModel
  mats: TwinMaterials
}) {
  const { m, pick } = mats
  const redFort = world.site.slug === 'red-fort'

  const rockMat = pick(m.rock, 'CONTEXTUAL')
  const stoneMat = pick(m.stoneAlt, 'CONTEXTUAL')
  const darkMat = pick(m.dark, 'CONTEXTUAL')

  const built = useMemo(() => {
    const terrain = world.collision.terrain
    const rocks: Inst[] = []
    const smallRocks: Inst[] = []
    const blocks: Inst[] = []
    const drums: Inst[] = []
    const rand = new Rand(`${world.seed}:scatterdetail`)

    for (const r of world.props.rocks) {
      const y = r.y ?? terrain(r.x, r.z)
      const target = r.s > 2.6 ? rocks : smallRocks

      target.push({
        p: [r.x, y + r.s * 0.32, r.z],
        s: [r.s * 2, r.s * 1.5, r.s * 1.8],
        r: [rand.jitter(0.4), r.rot, rand.jitter(0.4)],
      })
    }

    for (const f of world.props.fragments) {
      const y = f.y ?? terrain(f.x, f.z)

      if (f.variant === 1) {
        drums.push({
          p: [f.x, y + f.s * 0.34, f.z],
          s: [f.s * 1.2, f.s * 0.7, f.s * 1.2],
          r: [Math.PI / 2 + rand.jitter(0.2), f.rot, rand.jitter(0.15)],
        })
      } else if (f.variant === 2) {
        blocks.push({
          p: [f.x, y + f.s * 0.3, f.z],
          s: [f.s * 2.6, f.s * 0.6, f.s * 0.9],
          r: [0, f.rot, rand.jitter(0.12)],
        })
      } else {
        blocks.push({
          p: [f.x, y + f.s * 0.28, f.z],
          s: [f.s * 1.3, f.s * 0.55, f.s * 1.2],
          r: [rand.jitter(0.1), f.rot, rand.jitter(0.1)],
        })
      }
    }

    return { rocks, smallRocks, blocks, drums }
  }, [world])

  return (
    <group>
      <InstancedSet
        geometry={UNIT_ROCK_HI}
        material={rockMat}
        items={built.rocks}
      />
      <InstancedSet
        geometry={UNIT_ROCK}
        material={rockMat}
        items={built.smallRocks}
      />
      <InstancedSet
        geometry={UNIT_BOX}
        material={stoneMat}
        items={built.blocks}
      />
      <InstancedSet
        geometry={UNIT_CYL}
        material={stoneMat}
        items={built.drums}
      />

      {!redFort &&
        world.env.boundary.map((b, i) => (
          <group key={`b${i}`}>
            <mesh
              position={[b.x, b.h / 2, b.z]}
              geometry={box(b.w, b.h, b.d, m.tile)}
              material={pick(m.accent, 'CONTEXTUAL')}
              castShadow
              receiveShadow
            />
            <CourseLines
              cx={b.x}
              cz={b.z}
              w={b.w}
              d={b.d}
              y0={0}
              y1={b.h - 0.6}
              spacing={1.15}
              project={0.07}
              material={darkMat}
            />
            <Course
              cx={b.x}
              cz={b.z}
              w={b.w}
              d={b.d}
              y={b.h - 0.28}
              h={0.36}
              project={0.24}
              t={0.5}
              material={stoneMat}
            />
            <Parapet
              cx={b.x}
              cz={b.z}
              w={b.w - 0.4}
              d={b.d + 0.4}
              y={b.h}
              material={stoneMat}
              unit={0.65}
              h={0.55}
            />
          </group>
        ))}

      {!redFort &&
        world.env.bastions.map((bn, i) => (
          <group key={`bn${i}`}>
            <mesh
              position={[bn.x, bn.h / 2, bn.z]}
              geometry={cylinder(bn.r, bn.r * 1.12, bn.h, 24, m.tile)}
              material={pick(m.accent, 'CONTEXTUAL')}
              castShadow
              receiveShadow
            />
            <mesh
              position={[bn.x, bn.h * 0.32, bn.z]}
              geometry={cylinder(
                bn.r * 1.06,
                bn.r * 1.16,
                0.3,
                24,
                2,
              )}
              material={stoneMat}
              castShadow
            />
            <mesh
              position={[bn.x, bn.h * 0.7, bn.z]}
              geometry={cylinder(
                bn.r * 1.06,
                bn.r * 1.16,
                0.3,
                24,
                2,
              )}
              material={stoneMat}
              castShadow
            />
            <Chattri
              radius={bn.r * 0.9}
              height={bn.r * 1.1}
              position={[bn.x, bn.h, bn.z]}
              material={stoneMat}
              trim={darkMat}
            />
          </group>
        ))}

      {redFort && <RedFortComplex world={world} mats={mats} />}
    </group>
  )
}
