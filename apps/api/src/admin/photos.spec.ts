import assert from 'node:assert/strict';
import { test } from 'node:test';
import { youtubeId } from './photos';

test('the id is read from every kind of YouTube link', () => {
  for (const link of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?si=abc', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10s', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '  https://youtube.com/live/dQw4w9WgXcQ  ']) assert.equal(youtubeId(link), 'dQw4w9WgXcQ', link);
});

test('anything that is not a YouTube video is refused', () => {
  for (const link of ['https://vimeo.com/123456789', 'https://evil.example/watch?v=dQw4w9WgXcQ', 'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ"><script>', 'javascript:alert(1)', 'not a link', '', null, 42]) assert.equal(youtubeId(link), null, String(link));
});
