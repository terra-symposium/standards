/**
 * packages/reporting/.agents/skills/review/weekly/scripts/generate-weekly-review.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';

// COMPONENTS
import Color from 'colorjs.io';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const [inputPath, outputPath] = process.argv.slice(2);
const report = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const repo = report.repo;
const refs = report.refs ?? [report.ref];
const outputDir = outputPath.slice(0, outputPath.lastIndexOf('/'));
const usedHues = [];
const DARK = '#17251C';
const LIGHT = '#E6F0E8';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param args
 *
 * @return
 */
function git(args) {
	return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trimEnd();
}

/**
 *
 * @param props
 *
 * @return
 */
function readExcerpt({ sha, path, start, end }) {
	return git(['show', `${sha}:${path}`])
		.split('\n')
		.slice(start - 1, end)
		.join('\n');
}

/**
 *
 * @return
 */
function hue() {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		let value = randomInt(0, 360);
		if (value >= 70 && value <= 130) value += 60;
		if (usedHues.every((existing) => Math.min(Math.abs(existing - value), 360 - Math.abs(existing - value)) >= 35)) {
			usedHues.push(value);
			return value;
		}
	}
	return (usedHues.at(-1) ?? 0) + 37;
}

/**
 *
 * @param value
 * @param lightness
 * @param chroma
 *
 * @return
 */
function hex(value, lightness, chroma) {
	return new Color('oklch', [lightness, chroma, value]).to('srgb').toString({ format: 'hex' });
}

/**
 *
 * @return
 */
function theme() {
	const primaryHue = hue();
	const secondaryHue = (primaryHue + 150) % 360;
	return {
		surface: hex(primaryHue, 0.975, 0.018),
		tone: hex(primaryHue, 0.93, 0.045),
		rule: hex(primaryHue, 0.78, 0.085),
		text: hex(primaryHue, 0.26, 0.055),
		muted: hex(primaryHue, 0.43, 0.045),
		secondary: hex(secondaryHue, 0.56, 0.14),
	};
}

/**
 *
 * @param value
 * @param maxChars
 * @param name
 */
function assertLines(value, maxChars, name) {
	for (const line of String(value).split('\n')) {
		if (line.length > maxChars) throw new Error(`${name} line has ${line.length} characters; max is ${maxChars}. Add a deliberate line break or widen the frame.`);
	}
}

/**
 *
 * @param slide
 * @param value
 * @param position
 * @param style
 * @param name
 *
 * @return
 */
function addText(slide, value, position, style = {}, name = 'text') {
	assertLines(value, style.maxChars ?? Math.floor(position.width / Math.max(7, (style.fontSize ?? 16) * 0.52)), name);
	const shape = slide.shapes.add({ geometry: 'textbox', name, position, fill: 'none', line: { style: 'solid', fill: 'none', width: 0 } });
	shape.text = value;
	shape.text.style = {
		fontSize: style.fontSize ?? 16,
		typeface: style.typeface ?? 'AUTHENTIC Sans',
		color: style.color ?? '#1E2D24',
		bold: style.bold ?? false,
		italic: style.italic ?? false,
		alignment: style.alignment ?? 'left',
		verticalAlignment: 'top',
		wrap: 'none',
		autoFit: 'none',
		insets: { top: 0, right: 0, bottom: 0, left: 0 },
	};
	return shape;
}

/**
 *
 * @param slide
 * @param position
 * @param fill
 * @param line
 * @param name
 *
 * @return
 */
function rect(slide, position, fill, line = 'none', name = 'panel') {
	return slide.shapes.add({ geometry: 'rect', name, position, fill, line: { style: 'solid', fill: line, width: line === 'none' ? 0 : 1 } });
}

/**
 *
 * @param slide
 * @param position
 * @param colors
 * @param name
 * @param fill
 *
 * @return
 */
function card(slide, position, colors, name, fill = colors.tone) {
	return slide.shapes.add({ geometry: 'roundRect', name, position, fill, line: { style: 'solid', fill: colors.rule, width: 1 } });
}

/**
 *
 * @param slide
 * @param left
 * @param top
 * @param width
 * @param color
 * @param name
 *
 * @return
 */
function rule(slide, left, top, width, color, name) {
	return rect(slide, { left, top, width, height: 1 }, color, 'none', name);
}

/**
 *
 * @param slide
 * @param lines
 */
function notes(slide, lines) {
	slide.speakerNotes.textFrame.setText(`[Sources]\n${lines.map((line) => `- ${line}`).join('\n')}`);
	slide.speakerNotes.setVisible(true);
}

/**
 *
 * @param value
 * @param maxChars
 *
 * @return
 */
function wrapLines(value, maxChars) {
	return String(value)
		.split('\n')
		.flatMap((line) => {
			const words = line.split(/\s+/);
			const lines = [];
			let current = '';
			for (const word of words) {
				if (!word) continue;
				if (current && `${current} ${word}`.length > maxChars) {
					lines.push(current);
					current = word;
				} else current = current ? `${current} ${word}` : word;
			}
			if (current) lines.push(current);
			return lines.length ? lines : [''];
		})
		.join('\n');
}

/**
 *
 * @param slide
 * @param title
 * @param page
 * @param colors
 */
function header(slide, title, page, colors) {
	addText(slide, title, { left: 48, top: 42, width: 1136, height: 42 }, { fontSize: 30, color: colors.text, maxChars: 62 }, `title-${page}`);
	addText(slide, String(page).padStart(2, '0'), { left: 1180, top: 44, width: 52, height: 20 }, { fontSize: 14, color: colors.muted, alignment: 'right', maxChars: 2 }, `page-${page}`);
	rule(slide, 48, 108, 1184, colors.rule, `rule-${page}`);
}

/**
 *
 * @param slide
 * @param value
 * @param page
 * @param colors
 */
function footer(slide, value, page, colors) {
	rule(slide, 48, 674, 1184, colors.rule, `footer-rule-${page}`);
	addText(slide, value, { left: 48, top: 682, width: 1160, height: 18 }, { fontSize: 12, color: colors.muted, maxChars: 165 }, `footer-${page}`);
}

/**
 *
 * @param line
 *
 * @return
 */
function codeRuns(line) {
	const pattern =
		/(\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|try|catch|async|await|export|from|import|new|throw|type|interface|extends|as|typeof|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|[A-Za-z_$][\w$]*|[{}()]|\[|\]|[.,;:=<>!?+*-]|\x2f)/g;
	const runs = [];
	let last = 0;
	for (const match of line.matchAll(pattern)) {
		if (match.index > last) runs.push({ run: line.slice(last, match.index), textStyle: { color: LIGHT, fill: LIGHT } });
		const token = match[0];
		const color = token.startsWith('//')
			? '#7FA18B'
			: /^['"`]/.test(token)
				? '#F6C177'
				: /^(const|let|var|function|return|if|else|try|catch|async|await|export|from|import|new|throw|type|interface|extends|as|typeof|true|false|null|undefined)$/.test(token)
					? '#C7DDD0'
					: /^\d/.test(token)
						? '#F6C177'
						: /^[A-Za-z_$]/.test(token)
							? LIGHT
							: '#AFC4B5';
		runs.push({ run: token, textStyle: { color, fill: color } });
		last = match.index + token.length;
	}
	if (last < line.length) runs.push({ run: line.slice(last), textStyle: { color: LIGHT, fill: LIGHT } });
	return runs.length ? runs : [{ run: ' ', textStyle: { color: LIGHT, fill: LIGHT } }];
}

/**
 *
 * @param slide
 * @param codeInput
 * @param position
 * @param colors
 *
 * @return
 */
function addCode(slide, codeInput, position, colors) {
	const source = readExcerpt(codeInput);
	const lines = source.split('\n').map((line) => line.replaceAll('\t', '    '));
	const longest = Math.max(...lines.map((line) => line.length));
	const fontSize = Math.max(8, Math.min(14, Math.floor((position.width - 36) / Math.max(1, longest * 0.58))));
	if (fontSize === 8 && longest * 0.58 * fontSize > position.width - 36)
		throw new Error(`Code excerpt ${codeInput.path}:${codeInput.start}-${codeInput.end} is too wide; use a wider layout or a narrower complete range.`);
	const codeHeight = Math.min(position.height, Math.max(86, 62 + lines.length * Math.ceil(fontSize * 1.35)));
	const panelPosition = { ...position, height: codeHeight };
	rect(slide, panelPosition, DARK, colors.rule, `code-${codeInput.sha}`);
	addText(
		slide,
		`${codeInput.path} · ${codeInput.sha}`,
		{ left: position.left + 18, top: position.top + 14, width: position.width - 36, height: 18 },
		{ fontSize: 14, color: '#C7DDD0', maxChars: 85 },
		`code-label-${codeInput.sha}`,
	);
	const shape = slide.shapes.add({
		geometry: 'textbox',
		name: `code-body-${codeInput.sha}`,
		position: { left: position.left + 18, top: position.top + 44, width: position.width - 36, height: codeHeight - 56 },
		fill: 'none',
		line: { style: 'solid', fill: 'none', width: 0 },
	});
	shape.text.style = { fontSize, typeface: 'Menlo', alignment: 'left', verticalAlignment: 'top', wrap: 'none', autoFit: 'none', insets: { top: 0, right: 0, bottom: 0, left: 0 } };
	shape.text = lines.map((line) => codeRuns(line));
	return `${codeInput.sha} · ${codeInput.path}:${codeInput.start}-${codeInput.end}`;
}

/**
 *
 * @param slide
 * @param image
 * @param position
 * @param colors
 * @param page
 *
 * @return
 */
async function addScreenshot(slide, image, position, colors, page) {
	card(slide, position, colors, `screenshot-frame-${page}`, colors.tone);
	const bytes = await fs.readFile(image.path);
	slide.images.add({
		blob: bytes,
		contentType: 'image/png',
		alt: image.alt,
		fit: 'cover',
		geometry: 'roundRect',
		borderRadius: 12,
		position: { left: position.left + 8, top: position.top + 8, width: position.width - 16, height: position.height - 16 },
	});
	return `${image.route} · ${image.path}`;
}

/**
 *
 * @return
 */
function parseCommits() {
	const fmt = '%H%x09%h%x09%aN%x09%aI%x09%s';
	return git(['log', ...refs, `--since=${report.since}`, `--until=${report.until}`, '--no-merges', `--format=${fmt}`])
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [sha, short, author, authoredAt, ...subject] = line.split('\t');
			return { sha, short, author, date: authoredAt.slice(0, 10), subject: subject.join('\t'), paths: git(['show', '--format=', '--name-only', sha]).split('\n').filter(Boolean) };
		});
}

/**
 *
 * @return
 */
function parseHistoryCommits() {
	if (git(['rev-parse', '--is-shallow-repository']) === 'true') throw new Error('A complete Big Five assessment requires full Git history; fetch or unshallow the authoritative refs first.');
	const fmt = '%H%x09%h%x09%aN%x09%aI%x09%s';
	return git(['log', ...refs, `--until=${report.until}`, '--no-merges', `--format=${fmt}`])
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [sha, short, author, authoredAt, ...subject] = line.split('\t');
			return { sha, short, author, date: authoredAt.slice(0, 10), subject: subject.join('\t') };
		});
}

/**
 *
 * @param value
 * @param length
 *
 * @return
 */
/**
 *
 * @param date
 * @param plan
 *
 * @return
 */
function planDay(date, plan) {
	const start = new Date(`${plan.start}T00:00:00Z`).getTime();
	const end = new Date(`${plan.end}T00:00:00Z`).getTime();
	const value = new Date(`${date}T00:00:00Z`).getTime();
	return Math.round(((value - start) / (end - start)) * 90);
}

/**
 *
 * @param plan
 * @param contributor
 * @param props
 *
 * @return
 */
function validPlan(plan, contributor, { requirePreviousObjective = true, allowUnknownProgress = false } = {}) {
	if (!plan) return false;
	const required = [plan.source, plan.start, plan.end, plan.asOf, plan.outcome, ...(requirePreviousObjective ? [plan.previousObjective] : [])];
	if (!required.every((value) => typeof value === 'string' && value.length))
		throw new Error(`${contributor.name}: plan requires source, start, end, asOf, outcome${requirePreviousObjective ? ', and previousObjective' : ''}.`);
	if (!Array.isArray(plan.milestones) || !plan.milestones.length || plan.milestones.length > 6) throw new Error(`${contributor.name}: plan requires one to six milestones.`);
	const planStart = new Date(`${plan.start}T00:00:00Z`);
	const planEnd = new Date(`${plan.end}T00:00:00Z`);
	const asOf = new Date(`${plan.asOf}T00:00:00Z`);
	if ([planStart, planEnd, asOf].some((date) => Number.isNaN(date.valueOf())) || planStart >= planEnd || asOf < planStart || asOf > planEnd)
		throw new Error(`${contributor.name}: plan start, end, and asOf must be ordered ISO dates.`);
	for (const milestone of plan.milestones) {
		if (![milestone.name, milestone.start, milestone.end, milestone.evidence].every((value) => typeof value === 'string' && value.length))
			throw new Error(`${contributor.name}: each milestone requires name, start, end, and evidence.`);
		if (!(allowUnknownProgress && milestone.progress === null) && (!Number.isInteger(milestone.progress) || milestone.progress < 0 || milestone.progress > 100))
			throw new Error(`${contributor.name}: milestone progress must be an integer from 0 through 100${allowUnknownProgress ? ' or null when progress is unverified' : ''}.`);
		const start = new Date(`${milestone.start}T00:00:00Z`);
		const end = new Date(`${milestone.end}T00:00:00Z`);
		if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start < planStart || end > planEnd || start >= end)
			throw new Error(`${contributor.name}: milestone dates must sit within the plan window.`);
	}
	return true;
}

/**
 *
 * @param plan
 * @param historyCommits
 *
 * @return
 */
function assessBigFiveTimeline(plan, historyCommits) {
	if (typeof plan?.source !== 'string' || !plan.source.trim() || !Array.isArray(plan.objectives) || plan.objectives.length !== 5)
		throw new Error('Big Five timeline requires a source and five objectives, each assessed against the complete history of the requested refs.');
	const historyBySha = new Map(historyCommits.map((commit) => [commit.sha, commit]));
	const progressByStatus = { complete: 1, partial: 0.5, not_found: 0 };
	const milestones = plan.objectives.map((objective) => {
		if (typeof objective.name !== 'string' || !objective.name.trim() || !Array.isArray(objective.deliverables) || !objective.deliverables.length)
			throw new Error('Each Big Five objective requires a name and source-backed deliverable assessments.');
		let score = 0;
		const evidence = [];
		for (const deliverable of objective.deliverables) {
			if (typeof deliverable.name !== 'string' || !deliverable.name.trim() || !Object.hasOwn(progressByStatus, deliverable.status))
				throw new Error(`${objective.name}: each deliverable requires a name and status complete, partial, or not_found.`);
			const shas = deliverable.commits ?? [];
			if (!Array.isArray(shas) || (deliverable.status !== 'not_found' && !shas.length))
				throw new Error(`${objective.name} · ${deliverable.name}: complete/partial evidence requires commit SHAs; not_found requires none.`);
			if (deliverable.status === 'not_found' && shas.length) throw new Error(`${objective.name} · ${deliverable.name}: not_found cannot cite commits.`);
			for (const sha of shas) {
				const commit = historyBySha.get(sha);
				if (!commit) throw new Error(`${objective.name} · ${deliverable.name}: ${sha} is not in the complete history of the requested refs through ${report.until}.`);
				if (!commit.paths) commit.paths = git(['show', '--format=', '--name-only', sha]).split('\n').filter(Boolean);
				evidence.push(commit);
			}
			score += progressByStatus[deliverable.status];
		}
		const uniqueEvidence = [...new Map(evidence.map((commit) => [commit.sha, commit])).values()].sort((a, b) => a.date.localeCompare(b.date));
		return {
			name: objective.name,
			progress: Math.round((score / objective.deliverables.length) * 100),
			start: uniqueEvidence[0]?.date ?? '',
			end: uniqueEvidence.at(-1)?.date ?? '',
			deliverables: objective.deliverables,
			evidence: uniqueEvidence,
		};
	});
	const allDates = historyCommits.map((commit) => commit.date).sort();
	if (!allDates.length) throw new Error('The requested refs contain no Git history for the Big Five assessment.');
	return {
		title: plan.title ?? 'Big Five progress across full Git history',
		source: plan.source,
		start: allDates[0],
		end: report.until.slice(0, 10),
		asOf: report.until.slice(0, 10),
		outcome: 'Progress is measured by expected deliverables supported in full Git history.',
		progressBasis: 'Complete = 100%; partial = 50%; no Git evidence = 0% evidenced, not proof of no work.',
		historyCount: historyCommits.length,
		milestones,
	};
}

/**
 *
 * @param deck
 * @param section
 * @param colors
 * @param page
 * @param sources
 */
function addPlanSlide(deck, section, colors, page, sources) {
	const plan = section.plan;
	const slide = deck.slides.add();
	slide.background.fill = colors.surface;
	header(slide, `${section.name} · 90-day action plan`, page, colors);
	const elapsed = planDay(plan.asOf, plan);
	addText(slide, plan.outcome, { left: 58, top: 140, width: 1120, height: 46 }, { fontSize: 20, color: colors.muted, maxChars: 120 }, `plan-outcome-${page}`);
	addText(slide, `Last week said: ${plan.previousObjective}`, { left: 58, top: 202, width: 1120, height: 20 }, { fontSize: 15, color: colors.muted, maxChars: 112 }, `plan-previous-objective-${page}`);
	addText(
		slide,
		`${plan.scheduleLabel ?? 'Indicative weeks 1–12'} · ${plan.start} → ${plan.end} · as of ${plan.asOf} · day ${elapsed} of 90`,
		{ left: 58, top: 230, width: 760, height: 20 },
		{ fontSize: 15, color: colors.text, maxChars: 100 },
		`plan-window-${page}`,
	);
	if (plan.progressBasis) addText(slide, plan.progressBasis, { left: 58, top: 258, width: 1120, height: 20 }, { fontSize: 13, color: colors.muted, maxChars: 120 }, `plan-basis-${page}`);
	const labelLeft = 58;
	const chartLeft = 404;
	const chartWidth = 790;
	const chartTop = 290;
	const laneHeight = 48;
	const marker = chartLeft + (elapsed / 90) * chartWidth;
	['DAY 1', 'DAY 30', 'DAY 60', 'DAY 90'].forEach((label, i) => {
		const x = chartLeft + (i / 3) * chartWidth;
		rule(slide, x, chartTop - 12, 1, colors.rule, `plan-grid-${page}-${i}`);
		addText(
			slide,
			label,
			{ left: x - (i === 3 ? 38 : 0), top: chartTop - 38, width: 44, height: 16 },
			{ fontSize: 11, color: colors.muted, maxChars: 6, alignment: i === 3 ? 'right' : 'left' },
			`plan-axis-${page}-${i}`,
		);
	});
	plan.milestones.forEach((milestone, i) => {
		const top = chartTop + i * laneHeight;
		const start = planDay(milestone.start, plan);
		const end = planDay(milestone.end, plan);
		const left = chartLeft + (start / 90) * chartWidth;
		const width = Math.max(12, ((end - start) / 90) * chartWidth);
		addText(slide, milestone.name, { left: labelLeft, top: top + 7, width: 320, height: 20 }, { fontSize: 16, color: colors.text, maxChars: 40 }, `plan-name-${page}-${i}`);
		addText(slide, `${milestone.progress}%`, { left: 338, top: top + 7, width: 48, height: 20 }, { fontSize: 14, color: colors.muted, alignment: 'right', maxChars: 4 }, `plan-progress-${page}-${i}`);
		rect(slide, { left, top: top + 6, width, height: 20 }, colors.tone, colors.rule, `plan-track-${page}-${i}`);
		rect(slide, { left, top: top + 6, width: Math.max(2, width * (milestone.progress / 100)), height: 20 }, colors.secondary, 'none', `plan-complete-${page}-${i}`);
	});
	rule(slide, marker, chartTop - 52, 2, colors.secondary, `plan-asof-${page}`);
	addText(slide, 'AS OF', { left: marker - 24, top: chartTop - 66, width: 50, height: 14 }, { fontSize: 10, color: colors.text, alignment: 'center', maxChars: 6 }, `plan-asof-label-${page}`);
	addText(
		slide,
		plan.progressBasis ?? 'Progress key: 100 = complete in notes or closed PR · 50 = in progress or open PR · 0 = no verified completion',
		{ left: 58, top: 610, width: 820, height: 18 },
		{ fontSize: 13, color: colors.muted, maxChars: 120 },
		`plan-legend-${page}`,
	);
	footer(slide, `Planning context only · ${plan.source.split(' · https://')[0]}`, page, colors);
	notes(slide, [...sources, plan.source, ...plan.milestones.map((milestone) => `${milestone.name}: ${milestone.evidence}`)]);
}

/**
 *
 * @param deck
 * @param section
 * @param colors
 * @param page
 * @param sources
 */
function addMeetingSlide(deck, section, colors, page, sources) {
	const meeting = section.meeting;
	const slide = deck.slides.add();
	slide.background.fill = colors.surface;
	header(slide, meeting.title ?? `${section.name} · meeting notes`, page, colors);
	meeting.columns.forEach((column, i) => {
		const left = 58 + (i % 2) * 582;
		const top = 164 + Math.floor(i / 2) * 226;
		card(slide, { left, top, width: 556, height: 192 }, colors, `meeting-${page}-${i}`, i === 0 ? colors.tone : colors.surface);
		addText(slide, column.title, { left: left + 24, top: top + 20, width: 500, height: 22 }, { fontSize: 20, color: colors.text, maxChars: 34 }, `meeting-title-${page}-${i}`);
		addText(slide, column.body.join('\n'), { left: left + 24, top: top + 58, width: 500, height: 112 }, { fontSize: 16, color: colors.muted, maxChars: 58 }, `meeting-body-${page}-${i}`);
	});
	footer(slide, meeting.footer ?? 'Meeting notes provide context; GitHub and Git remain the delivery evidence.', page, colors);
	notes(slide, [...sources, ...(meeting.sources ?? [])]);
}

/**
 *
 * @param deck
 * @param section
 * @param goal
 * @param colors
 * @param page
 * @param sources
 */
function addContributorSummary(deck, section, goal, colors, page, sources) {
	const slide = deck.slides.add();
	slide.background.fill = colors.surface;
	header(slide, `${section.name} · summary`, page, colors);
	const identity = section.name.includes('bot') ? 'Automated Git identity' : section.name.includes('unverified') ? 'Unverified Git identity' : 'Recorded Git identity';
	addText(
		slide,
		`${section.commitCount} non-merge commits · ${identity}`,
		{ left: 58, top: 158, width: 1120, height: 30 },
		{ fontSize: 20, color: colors.muted, maxChars: 74 },
		`contribution-meta-${page}`,
	);
	const outcomes = section.slides.flatMap((i) => i.bullets ?? []).slice(0, 6);
	const body = outcomes.length ? wrapLines(outcomes.join('\n'), 64) : '• No contribution detail was supplied for this identity.';
	card(slide, { left: 58, top: 214, width: 680, height: 332 }, colors, `contribution-outcomes-${page}`);
	addText(slide, 'Recorded outcomes', { left: 84, top: 238, width: 600, height: 26 }, { fontSize: 20, color: colors.text, maxChars: 34 }, `contribution-heading-${page}`);
	addText(slide, body, { left: 84, top: 282, width: 600, height: 230 }, { fontSize: 17, color: colors.text, maxChars: 66 }, `contribution-body-${page}`);
	card(slide, { left: 770, top: 214, width: 452, height: 332 }, colors, `contribution-goal-${page}`, colors.tone);
	addText(
		slide,
		goal?.person ? `Stated goal · ${goal.person}` : 'Goal match',
		{ left: 796, top: 238, width: 400, height: 26 },
		{ fontSize: 20, color: colors.text, maxChars: 34 },
		`contribution-goal-heading-${page}`,
	);
	addText(
		slide,
		wrapLines(goal?.goal ?? 'No person-to-plan match is verified for this Git identity.', 44),
		{ left: 796, top: 282, width: 400, height: 176 },
		{ fontSize: 17, color: colors.text, maxChars: 44 },
		`contribution-goal-body-${page}`,
	);
	addText(slide, goal?.status ?? 'Attribution not verified', { left: 796, top: 476, width: 400, height: 28 }, { fontSize: 15, color: colors.muted, maxChars: 44 }, `contribution-status-${page}`);
	footer(slide, `${section.commitCount} commits · ${identity.toLowerCase()} · branch evidence only`, page, colors);
	notes(slide, [...sources, ...(goal ? [`${goal.source} · ${goal.status}`] : []), ...section.slides.flatMap((i) => i.sources ?? [])]);
}

/**
 *
 * @param deck
 * @param goal
 * @param colors
 * @param page
 * @param sources
 */
function addNoCommitsSlide(deck, goal, colors, page, sources) {
	const slide = deck.slides.add();
	slide.background.fill = colors.surface;
	header(slide, `${goal.person} · no attributed commits`, page, colors);
	card(slide, { left: 58, top: 164, width: 720, height: 350 }, colors, `no-commits-${page}`);
	addText(slide, 'Standard Git comparison', { left: 86, top: 190, width: 650, height: 28 }, { fontSize: 21, color: colors.text, maxChars: 38 }, `no-commits-heading-${page}`);
	addText(
		slide,
		wrapLines(`Goal\n${goal.goal}\n\nGit status\n${goal.status}\n\nNo commits were attributed to this person during the reporting window.`, 66),
		{ left: 86, top: 238, width: 650, height: 240 },
		{ fontSize: 17, color: colors.text, maxChars: 66 },
		`no-commits-body-${page}`,
	);
	card(slide, { left: 808, top: 164, width: 414, height: 350 }, colors, `no-commits-context-${page}`, colors.tone);
	addText(slide, 'Evidence source', { left: 834, top: 190, width: 360, height: 28 }, { fontSize: 20, color: colors.text, maxChars: 32 }, `no-commits-source-heading-${page}`);
	addText(slide, wrapLines(goal.source, 40), { left: 834, top: 238, width: 360, height: 180 }, { fontSize: 16, color: colors.muted, maxChars: 40 }, `no-commits-source-${page}`);
	addText(
		slide,
		wrapLines('A missing commit does not establish whether the work happened.', 40),
		{ left: 834, top: 438, width: 360, height: 54 },
		{ fontSize: 15, color: colors.text, maxChars: 40 },
		`no-commits-caveat-${page}`,
	);
	footer(slide, 'Git attribution comparison · no performance conclusion', page, colors);
	notes(slide, [...sources, `${goal.source} · ${goal.status}`]);
}

/**
 *
 * @return
 */
async function main() {
	const historyCommits = parseHistoryCommits();
	report.bigFive = assessBigFiveTimeline(report.bigFive, historyCommits);
	const commits = parseCommits();
	const mergeCount = Number(git(['rev-list', '--count', ...refs, `--since=${report.since}`, `--until=${report.until}`, '--merges']));
	const counts = new Map(commits.map((commit) => [commit.author, commits.filter((other) => other.author === commit.author).length]));
	const screenshotCount = report.contributors.flatMap((section) => section.slides).filter((i) => i.screenshot).length;
	const sources = [
		`Refs: ${refs.join(', ')}`,
		`Window: ${report.since} through ${report.until} (${report.timezone})`,
		`Non-merge commits: ${commits.length}; merge commits: ${mergeCount}`,
		`Big Five evidence: ${historyCommits.length} non-merge commits across full history through ${report.until}`,
		'No Netlify deploy was triggered for this report.',
	];
	const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
	let page = 1;
	{
		const slide = deck.slides.add();
		slide.background.fill = '#183D25';
		addText(slide, report.brand.toLowerCase(), { left: 60, top: 56, width: 540, height: 24 }, { fontSize: 20, typeface: 'Avara', italic: true, color: '#F2F8F1', maxChars: 48 }, 'cover-brand');
		addText(slide, report.title, { left: 60, top: 196, width: 800, height: 64 }, { fontSize: 48, typeface: 'Avara', italic: true, color: '#F2F8F1', maxChars: 38 }, 'cover-title');
		addText(slide, report.subtitle, { left: 60, top: 292, width: 760, height: 28 }, { fontSize: 20, color: '#C8DCCB', maxChars: 88 }, 'cover-subtitle');
		rule(slide, 60, 370, 450, '#B6D7B9', 'cover-rule');
		addText(
			slide,
			`${report.since.slice(0, 10)} → ${report.until.slice(0, 10)} · ${report.timezone}`,
			{ left: 60, top: 392, width: 600, height: 22 },
			{ fontSize: 16, color: '#F2F8F1', maxChars: 56 },
			'cover-window',
		);
		notes(slide, sources);
		page += 1;
	}
	if (report.goals?.length) {
		const colors = theme();
		const slide = deck.slides.add();
		slide.background.fill = colors.surface;
		header(slide, 'The week began with visible team commitments', page, colors);
		report.goals.slice(0, 5).forEach((goal, i) => {
			const left = 58 + (i % 3) * 388;
			const top = 164 + Math.floor(i / 3) * 226;
			card(slide, { left, top, width: 352, height: 192 }, colors, `goal-${i}`, i === 0 ? colors.tone : colors.surface);
			addText(slide, goal.person, { left: left + 24, top: top + 20, width: 280, height: 22 }, { fontSize: 19, color: colors.text, maxChars: 28 }, `goal-person-${i}`);
			addText(slide, goal.goal, { left: left + 24, top: top + 58, width: 304, height: 54 }, { fontSize: 15, color: colors.muted, maxChars: 42 }, `goal-copy-${i}`);
			addText(slide, goal.status, { left: left + 24, top: top + 140, width: 304, height: 20 }, { fontSize: 13, color: colors.muted, maxChars: 42 }, `goal-status-${i}`);
		});
		footer(slide, 'Planning context informs the review; repo evidence remains the implementation source of truth.', page, colors);
		notes(slide, [...sources, ...report.goals.map((goal) => `${goal.source} · ${goal.status}`)]);
		page += 1;
	}
	if (report.access?.columns?.length) {
		const colors = theme();
		const slide = deck.slides.add();
		slide.background.fill = colors.surface;
		header(slide, report.access.title, page, colors);
		report.access.columns.forEach((column, i) => {
			const left = 58 + i * 388;
			card(slide, { left, top: 168, width: 352, height: 320 }, colors, `access-${i}`, i === 0 ? colors.tone : colors.surface);
			addText(slide, column.title, { left: left + 26, top: 194, width: 292, height: 24 }, { fontSize: 20, color: colors.text, maxChars: 30 }, `access-title-${i}`);
			addText(slide, column.body.join('\n'), { left: left + 26, top: 244, width: 292, height: 200 }, { fontSize: 16, color: colors.muted, maxChars: 38 }, `access-body-${i}`);
		});
		footer(slide, report.access.footer, page, colors);
		notes(slide, [...sources, ...(report.access.sources ?? [])]);
		page += 1;
	}
	{
		const plan = report.bigFive;
		const colors = theme();
		const slide = deck.slides.add();
		slide.background.fill = colors.surface;
		header(slide, plan.title, page, colors);
		addText(
			slide,
			`${plan.historyCount} non-merge commits · full history of ${refs.join(', ')}`,
			{ left: 58, top: 144, width: 1120, height: 24 },
			{ fontSize: 18, color: colors.muted, maxChars: 92 },
			`big-five-outcome-${page}`,
		);
		addText(slide, `${plan.start} → ${plan.end} · cutoff ${plan.asOf}`, { left: 58, top: 180, width: 740, height: 20 }, { fontSize: 15, color: colors.text, maxChars: 72 }, `big-five-window-${page}`);
		addText(slide, plan.progressBasis, { left: 58, top: 210, width: 1120, height: 36 }, { fontSize: 14, color: colors.muted, maxChars: 112 }, `big-five-basis-${page}`);
		const chartLeft = 404;
		const chartWidth = 790;
		const chartTop = 300;
		const laneHeight = 54;
		const rangeStart = new Date(`${plan.start}T00:00:00Z`).valueOf();
		const rangeEnd = new Date(`${plan.end}T00:00:00Z`).valueOf();
		const range = Math.max(1, rangeEnd - rangeStart);
		/**
		 *
		 * @param date
		 *
		 * @return
		 */
		const timelineX = (date) => chartLeft + ((new Date(`${date}T00:00:00Z`).valueOf() - rangeStart) / range) * chartWidth;
		const marker = timelineX(plan.asOf);
		for (let index = 0; index <= 4; index += 1) {
			const x = chartLeft + (index / 4) * chartWidth;
			const date = new Date(rangeStart + (range * index) / 4).toISOString().slice(0, 4);
			rule(slide, x, chartTop - 12, 1, colors.rule, `big-five-grid-${page}-${index}`);
			addText(
				slide,
				date,
				{ left: x - (index === 4 ? 48 : 0), top: chartTop - 38, width: 56, height: 16 },
				{ fontSize: 11, color: colors.muted, maxChars: 7, alignment: index === 4 ? 'right' : 'left' },
				`big-five-axis-${page}-${index}`,
			);
		}
		plan.milestones.forEach((milestone, i) => {
			const top = chartTop + i * laneHeight;
			addText(slide, wrapLines(milestone.name, 32), { left: 58, top: top + 5, width: 264, height: 38 }, { fontSize: 14, color: colors.text, maxChars: 32 }, `big-five-name-${page}-${i}`);
			addText(
				slide,
				`${milestone.progress}%`,
				{ left: 330, top: top + 5, width: 56, height: 20 },
				{ fontSize: 14, color: colors.muted, alignment: 'right', maxChars: 5 },
				`big-five-progress-${page}-${i}`,
			);
			rule(slide, chartLeft, top + 18, chartWidth, colors.rule, `big-five-track-${page}-${i}`);
			for (const commit of milestone.evidence)
				rect(slide, { left: timelineX(commit.date) - 1, top: top + 8, width: 3, height: 20 }, colors.secondary, 'none', `big-five-evidence-${page}-${i}-${commit.short}`);
		});
		rule(slide, marker, chartTop - 12, 2, colors.text, `big-five-asof-${page}`);
		addText(slide, 'AS OF', { left: marker - 24, top: chartTop - 29, width: 50, height: 14 }, { fontSize: 10, color: colors.text, alignment: 'center', maxChars: 6 }, `big-five-asof-label-${page}`);
		addText(
			slide,
			'Ticks = supporting commits by author date · % = evidenced deliverables: complete 100%, partial 50%, none 0%',
			{ left: 58, top: 600, width: 1120, height: 36 },
			{ fontSize: 13, color: colors.muted, maxChars: 116 },
			`big-five-legend-${page}`,
		);
		footer(slide, 'Git evidence measures what is in the repository; it does not prove work absent from Git.', page, colors);
		const objectiveSources = plan.milestones.flatMap((milestone) => [
			`${milestone.name}: ${milestone.deliverables.map((i) => `${i.name} — ${i.status}`).join('; ')}`,
			...milestone.evidence.map((commit) => `${commit.sha} · ${commit.date} · ${commit.subject} · ${commit.paths.join(', ')}`),
		]);
		notes(slide, [...sources, plan.source, ...objectiveSources]);
		page += 1;
	}
	{
		const colors = theme();
		const slide = deck.slides.add();
		slide.background.fill = colors.surface;
		header(slide, report.overview.title, page, colors);
		const metrics = [
			[String(commits.length), 'non-merge commits'],
			[String(counts.size), 'contributors'],
			[String(mergeCount), 'merge commits'],
			[String(screenshotCount), 'verified UI captures'],
		];
		metrics.forEach(([value, label], i) => {
			const left = 58 + i * 272;
			addText(slide, value, { left, top: 168, width: 210, height: 54 }, { fontSize: 46, color: colors.text, maxChars: 5 }, `metric-${i}`);
			addText(slide, label, { left, top: 226, width: 210, height: 20 }, { fontSize: 14, color: colors.muted, maxChars: 28 }, `metric-label-${i}`);
		});
		addText(slide, report.overview.throughline, { left: 58, top: 340, width: 1120, height: 52 }, { fontSize: 20, color: colors.muted, maxChars: 106 }, 'overview-throughline');
		footer(slide, `${commits.length} non-merge commits · ${counts.size} contributors · ${mergeCount} merges · no Netlify deploy spent`, page, colors);
		notes(slide, sources);
		page += 1;
	}
	{
		const colors = theme();
		const slide = deck.slides.add();
		slide.background.fill = colors.surface;
		header(slide, report.workstreamsTitle, page, colors);
		report.workstreams.forEach((i, v) => {
			const top = 160 + v * 108;
			card(slide, { left: 58, top, width: 1164, height: 80 }, colors, `stream-${v}`, v === 0 ? colors.tone : colors.surface);
			addText(slide, i.name, { left: 82, top: top + 16, width: 260, height: 24 }, { fontSize: 20, color: colors.text, maxChars: 26 }, `stream-name-${v}`);
			addText(slide, i.summary, { left: 360, top: top + 16, width: 570, height: 24 }, { fontSize: 16, color: colors.muted, maxChars: 88 }, `stream-summary-${v}`);
			addText(
				slide,
				i.evidence,
				{ left: 960, top: top + 16, width: 230, height: 20 },
				{ fontSize: 13, typeface: 'Menlo', color: colors.muted, alignment: 'right', maxChars: 29 },
				`stream-evidence-${v}`,
			);
		});
		footer(slide, 'Repo evidence is summarized in the contributor sections and speaker notes.', page, colors);
		notes(slide, sources);
		page += 1;
	}
	const orderedGoals = [...(report.goals ?? [])];
	if (report.randomizePeople) {
		for (let index = orderedGoals.length - 1; index > 0; index -= 1) {
			const swapIndex = randomInt(0, index + 1);
			[orderedGoals[index], orderedGoals[swapIndex]] = [orderedGoals[swapIndex], orderedGoals[index]];
		}
	}
	const sections = report.contributors;
	const matchedSections = new Set();
	const contributorSections = [
		...orderedGoals.map((goal) => {
			const section = sections.find((i) => i.name.toLowerCase() === goal.person.toLowerCase() || i.name.toLowerCase().startsWith(`${goal.person.toLowerCase()} `));
			if (section) matchedSections.add(section);
			return { goal, section };
		}),
		...sections.filter((section) => !matchedSections.has(section)).map((section) => ({ section })),
	];
	for (const { goal, section } of contributorSections) {
		const colors = theme();
		if (!section || section.commitCount <= 0) {
			if (goal) {
				addNoCommitsSlide(deck, goal, colors, page, sources);
				page += 1;
			}
			continue;
		}
		if (section.meeting) {
			addMeetingSlide(deck, section, colors, page, sources);
			page += 1;
		}
		if (validPlan(section.plan, section)) {
			addPlanSlide(deck, section, colors, page, sources);
			page += 1;
		}
		addContributorSummary(deck, section, goal, colors, page, sources);
		page += 1;
		for (const item of section.slides) {
			const slide = deck.slides.add();
			slide.background.fill = colors.surface;
			header(slide, item.title, page, colors);
			addText(slide, item.lead, { left: 58, top: 164, width: 500, height: 76 }, { fontSize: 19, color: colors.muted, maxChars: 42 }, `lead-${page}`);
			addText(slide, item.heading, { left: 58, top: 252, width: 500, height: 24 }, { fontSize: 20, color: colors.text, maxChars: 44 }, `heading-${page}`);
			addText(slide, item.bullets.join('\n'), { left: 58, top: 292, width: 500, height: 186 }, { fontSize: 17, color: colors.text, maxChars: 56 }, `bullets-${page}`);
			let codeSource = '';
			if (item.screenshot) codeSource = await addScreenshot(slide, item.screenshot, { left: 590, top: 164, width: 632, height: 390 }, colors, page);
			else if (item.code) codeSource = addCode(slide, item.code, { left: 590, top: 164, width: 632, height: 412 }, colors);
			else {
				card(slide, { left: 590, top: 164, width: 632, height: 286 }, colors, `commit-panel-${page}`);
				addText(slide, item.commitTrailTitle, { left: 620, top: 190, width: 540, height: 24 }, { fontSize: 20, color: colors.text, maxChars: 46 }, `trail-title-${page}`);
				addText(slide, item.commitTrail.join('\n'), { left: 620, top: 236, width: 540, height: 170 }, { fontSize: 16, typeface: 'Menlo', color: colors.text, maxChars: 62 }, `trail-${page}`);
			}
			if (item.caption) addText(slide, item.caption, { left: 590, top: 572, width: 620, height: 48 }, { fontSize: 15, color: colors.muted, maxChars: 76 }, `caption-${page}`);
			footer(slide, item.footer, page, colors);
			notes(slide, [...sources, ...(item.sources ?? []), ...(codeSource ? [codeSource] : [])]);
			page += 1;
		}
	}
	{
		const colors = theme();
		const slide = deck.slides.add();
		slide.background.fill = colors.surface;
		header(slide, report.method.title, page, colors);
		report.method.columns.forEach((column, i) => {
			const left = 58 + i * 388;
			card(slide, { left, top: 168, width: 352, height: 280 }, colors, `method-${i}`, i % 2 ? colors.surface : colors.tone);
			addText(slide, column.title, { left: left + 26, top: 194, width: 292, height: 24 }, { fontSize: 20, color: colors.text, maxChars: 31 }, `method-title-${i}`);
			addText(slide, column.body.join('\n'), { left: left + 26, top: 244, width: 292, height: 158 }, { fontSize: 16, color: colors.muted, maxChars: 38 }, `method-body-${i}`);
		});
		footer(slide, report.method.footer, page, colors);
		notes(slide, sources);
		page += 1;
	}
	await fs.mkdir(outputDir, { recursive: true });
	const pptx = await PresentationFile.exportPptx(deck);
	await pptx.save(outputPath);
	console.log(JSON.stringify({ outputPath, slides: deck.slides.items.length, commits: commits.length, mergeCount }, null, 2));
}
if (!inputPath || !outputPath) throw new Error('Usage: generate-weekly-review.mjs <report.json> <output.pptx>');
if (!refs.filter(Boolean).length) throw new Error('Provide report.ref or report.refs.');
if (!report.bigFive)
	throw new Error(
		'A Big Five progress timeline is required. Assess every objective against the complete Git history on the requested refs through the report end date, then supply deliverable assessments with full commit SHAs.',
	);
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
