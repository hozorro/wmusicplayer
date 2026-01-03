export class LyricParser {
  private metadata: LyricMeta = {};
  private lines: LyricLine[] = [];

  constructor(content: string) {
    this.parse(content);
  }

  private parse(content: string): void {
    const cleanContent = content.trim()
    const timeTagRegex = /(\[\d{2}:\d{2}\.\d{2,3}\])/;
    const parts = cleanContent.split(timeTagRegex);

    const metadata: LyricMeta = {};
    const lyricLines: LyricLine[] = [];
    
    for(let i = 0; i < parts.length; i++){
      const part = parts[i].trim();
      if(!part) continue;
      if(timeTagRegex.test(part)) {
        const nextIndex = i + 1;
        if(nextIndex < parts.length) {
          const text = parts[nextIndex].trim();
          i++;

          const timeMatches = part.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/)
          if(timeMatches) {
            const [, mm, ss, ms] = timeMatches;
            const timeInSec = parseInt(mm, 10) * 60 + parseInt(ss, 10) + parseInt(ms.padEnd(3, '0'), 10) / 1000;
            const metaMatch = text.match(/^(\w+):([^\]]*)$/);
            if(metaMatch) {
              const key = metaMatch[1].toLowerCase();
              let value: string | number = metaMatch[2];
              if(key === 'total' || key === 'offset') {
                value = parseInt(value, 10);
              }
              metadata[key] = value;
            } else if (text) {
              lyricLines.push({ time: timeInSec, text });
            }
          }
        }
      } else { 
        const globalMetaMatch = part.match(/^(\w+):([^\s]+)/);
        if(globalMetaMatch) {
          const key = globalMetaMatch[1].toLowerCase();
          let value: string | number = globalMetaMatch[2];
          if(key === 'total' || key === 'offset') {
            value = parseInt(value, 10);
          }
          metadata[key] = value;
        }
      }
    }

    lyricLines.sort((a, b) => a.time - b.time);
    this.metadata = metadata;
    this.lines = lyricLines;
  }

  getMetadata(): LyricMeta {
    return {...this.metadata};
  }
  getLyrics(): LyricLine[] {
    return [...this.lines];
  }
  getCurrentLyricIndex(time: number): number {
    let left = 0, right = this.lines.length - 1
    let result = -1
    while(left <= right) {
      const mid = Math.floor((left + right) / 2)
      if(this.lines[mid].time <= time) {
        result = mid
        left = mid + 1
      } else {
        right = mid - 1
      }
    }
    return result
  }
  getCurrentLyric(time: number): string {
    const index = this.getCurrentLyricIndex(time)
    return index === -1 ? '' : this.lines[index].text
  }
  regenerate(): string {
    const meta = Object.entries(this.metadata).map(([key, value]) => `[${key}:${value}]`).join('\n')
    const lyrics = this.lines.map(line => {
      const total = line.time
      const m = Math.floor(total / 60)
      const s = Math.floor(total % 60)
      const ms = Math.floor((total % 1) * 1000)
      return `[${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${ms.toString().padStart(3, '0')}]${line.text}`
    }).join('\n')
    return `${meta}\n${lyrics}`
  }
}