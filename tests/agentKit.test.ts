import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DpadStateMachine } from '../plugins/tap-web-sdk/skills/tap-dpad/scripts/dpad';
import { KnobTracker } from '../plugins/tap-web-sdk/skills/tap-knob/scripts/knob';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = resolve(ROOT, 'plugins/tap-web-sdk');
const SKILLS_DIR = resolve(PLUGIN, 'skills');

const skills = readdirSync(SKILLS_DIR)
    .map((name) => resolve(SKILLS_DIR, name))
    .filter((path) => statSync(path).isDirectory());

describe('agent kit', () => {
    it('points marketplaces at the plugin', () => {
        const claude = JSON.parse(readFileSync(resolve(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
        const codex = JSON.parse(readFileSync(resolve(ROOT, '.agents/plugins/marketplace.json'), 'utf8'));
        expect(resolve(ROOT, claude.plugins[0].source)).toBe(PLUGIN);
        expect(resolve(ROOT, codex.plugins[0].source.path)).toBe(PLUGIN);
        for (const manifest of ['.claude-plugin', '.codex-plugin']) {
            const plugin = JSON.parse(readFileSync(resolve(PLUGIN, manifest, 'plugin.json'), 'utf8'));
            expect(plugin.name).toBe('tap-web-sdk');
        }
    });

    it('has the eight skills', () => {
        expect(skills.map((path) => path.split('/').pop()).sort()).toEqual([
            'tap-build-an-app',
            'tap-dpad',
            'tap-getting-started',
            'tap-imu-motion',
            'tap-knob',
            'tap-raw-sensors',
            'tap-tapping',
            'tap-vision-models',
        ]);
    });

    it.each(skills.map((path) => [path.split('/').pop() ?? path, path]))(
        '%s has frontmatter and script links',
        (name, skill) => {
            const text = readFileSync(resolve(skill, 'SKILL.md'), 'utf8');
            const front = text.match(/^---\nname: (\S+)\ndescription: (.+)\n---\n/);
            expect(front, 'SKILL.md needs name + description frontmatter').not.toBeNull();
            expect(front?.[1]).toBe(name);
            for (const link of text.matchAll(/\]\((scripts\/[^)]+)\)/g)) {
                expect(existsSync(resolve(skill, link[1])), link[1]).toBe(true);
            }
        },
    );
});

describe('KnobTracker', () => {
    it('counts steps, wraps roll, and releases', () => {
        const knob = new KnobTracker(2, 4);
        expect(knob.onRoll(10)).toBe(0);
        expect(knob.onGesture(111)).toBe('start');
        expect(knob.active).toBe(1);
        expect(knob.onRoll(10)).toBe(0);
        expect([11, 12, 15, 9].map((roll) => knob.onRoll(roll))).toEqual([0, 1, 1, -2]);
        expect(knob.onGesture(110)).toBe('start');
        expect(knob.active).toBe(0);
        expect(knob.onRoll(179)).toBe(0);
        expect(knob.onRoll(-177)).toBe(2);
        expect([100, 100, 100, 100].map((code) => knob.onGesture(code))).toEqual([
            null,
            null,
            null,
            'release',
        ]);
        expect(knob.active).toBeNull();
    });
});

describe('DpadStateMachine', () => {
    it('locks rotate and ignores repeats', () => {
        const dpad = new DpadStateMachine();
        expect(dpad.onGesture(101, 0)).toEqual([['direction', 'left']]);
        expect(dpad.onGesture(101, 0.01)).toEqual([]);
        expect(dpad.onGesture(105, 0.1)).toEqual([['pinch', 0]]);
        expect(dpad.onGesture(110, 0.2)).toEqual([['hold', 0]]);
        expect(dpad.mode).toBe('pending');
        expect(dpad.onGesture(105, 0.25)).toEqual([]);
        dpad.onMotion(0, 0, 0, 0.3);
        expect(dpad.onMotion(0, 0, 30, 0.5)).toContainEqual(['mode', 'rotate']);
        expect(dpad.onMotion(5, 5, 40, 0.6)).toEqual([['rotate', 40]]);
        const events = [0, 1, 2, 3].flatMap((t) => dpad.onGesture(100, 0.7 + t * 0.05));
        expect(events).toEqual([['release', 0]]);
        expect(dpad.held).toBeNull();
    });

    it('locks drag and hides on a fist', () => {
        const dpad = new DpadStateMachine();
        dpad.onGesture(112, 0);
        dpad.onMotion(0, 0, 0, 0.1);
        dpad.onMotion(0, 0, 5, 0.5);
        expect(dpad.onMotion(3, -2, 5, 1.1)).toEqual([['mode', 'drag'], ['drag', 3, -2]]);
        expect(dpad.onGesture(114, 1.2)).toEqual([['release', 2], ['hide']]);
        expect(dpad.onGesture(101, 1.3)).toEqual([]);
        expect(dpad.onGesture(100, 1.4)).toEqual([]);
        expect(dpad.onGesture(100, 1.5)).toEqual([['show']]);
    });
});
