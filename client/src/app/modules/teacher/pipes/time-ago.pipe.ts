import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo'
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date): string {
    if (!value) return '';

    const date = new Date(value);
    const now = new Date();

    // Debug logging
    console.log('TimeAgo pipe - Input:', value);
    console.log('TimeAgo pipe - Parsed date:', date);
    console.log('TimeAgo pipe - Current time:', now);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', value);
      return 'Invalid date';
    }

    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    console.log('TimeAgo pipe - Diff in seconds:', diffInSeconds);
    console.log('TimeAgo pipe - Diff in minutes:', diffInMinutes);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    } else if (diffInDays < 7) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
