/**
 * A lightweight implementation of the Porter Stemmer algorithm.
 * Reduces words to their root form (e.g., "running" -> "run", "decisions" -> "decis").
 * sufficient for improving keyword matching recalls without heavy NLP libraries.
 */

export function stemmer(w: string): string {
    if (w.length < 3) return w;

    let word = w.toLowerCase();

    // Step 1a
    if (word.endsWith('sses')) word = word.slice(0, -2);
    else if (word.endsWith('ies')) word = word.slice(0, -2); // 'ponies' -> 'poni' (Porter logic) - actually usually 'y' replacement happens later or simpler logic
    else if (word.endsWith('ss')) word = word;
    else if (word.endsWith('s')) word = word.slice(0, -1);

    // Simplified Porter-like steps for common English suffixes
    // rigorous Porter is complex; this is a heuristic approximation for our use case

    const mgr1 = (str: string) => (str.match(/[aeiou][^aeiou]/g) || []).length > 0;
    const mgr0 = (str: string) => (str.match(/[aeiou][^aeiou]/g) || []).length >= 0; // always true if vowels exist?

    // Step 1b
    if (word.endsWith('eed')) {
        const stem = word.slice(0, -3);
        if (mgr1(stem)) word = stem + 'ee';
    } else if (word.endsWith('ed')) {
        const stem = word.slice(0, -2);
        if (/[aeiou]/.test(stem)) {
            word = stem;
            word = step1bCleanup(word);
        }
    } else if (word.endsWith('ing')) {
        const stem = word.slice(0, -3);
        if (/[aeiou]/.test(stem)) {
            word = stem;
            word = step1bCleanup(word);
        }
    }

    // Step 1c - Turn happy -> happi
    if (word.endsWith('y') && /[aeiou]/.test(word.slice(0, -1))) {
        word = word.slice(0, -1) + 'i';
    }

    // Step 2 & 3 - Suffix replacement (simplified)
    const suffixes: [string, string][] = [
        ['ational', 'ate'],
        ['tional', 'tion'],
        ['enci', 'ence'],
        ['anci', 'ance'],
        ['izer', 'ize'],
        ['abli', 'able'],
        ['alli', 'al'],
        ['entli', 'ent'],
        ['eli', 'e'],
        ['ousli', 'ous'],
        ['ization', 'ize'],
        ['ation', 'ate'],
        ['ator', 'ate'],
        ['alism', 'al'],
        ['iveness', 'ive'],
        ['fulness', 'ful'],
        ['ousness', 'ous'],
        ['aliti', 'al'],
        ['iviti', 'ive'],
        ['biliti', 'ble']
    ];

    for (const [suffix, replacement] of suffixes) {
        if (word.endsWith(suffix)) {
            const stem = word.slice(0, -suffix.length);
            if (mgr1(stem)) {
                word = stem + replacement;
                break; // One replacement per step
            }
        }
    }

    // Stick to basic stemming for now to avoid over-stemming in critical business context

    return word;
}

function step1bCleanup(word: string): string {
    if (word.endsWith('at') || word.endsWith('bl') || word.endsWith('iz')) return word + 'e';
    if (['bb', 'dd', 'ff', 'gg', 'mm', 'nn', 'pp', 'rr', 'tt'].some(d => word.endsWith(d))) return word.slice(0, -1);
    // double consonant logic omitted for brevity in heuristic version
    return word;
}
