export function getName(...names: string[]): string {
    return `${names.join('-')}`
}

export function getUniqueName(...names: string[]): string {
    const differentiator = Math.random().toString(36).substring(7);
    names.push(differentiator);
    return this.getName(...names);
}

export function format(str:string = '') {
    return encodeURIComponent(str).replace('+', '-')
    .replace('=', '_')
    .replace('/', '~');
}

export function prefixUrl(url:string):string {
    return 'https://' + String(url).replace(/https?\:\/\//, '');
}