'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface VideosChannelFilterProps {
  availableChannels: string[];
  selectedChannel?: string;
  selectedSort: string;
  showRecentStudySort: boolean;
  showUnassignedChannel: boolean;
  unassignedChannelValue: string;
}

const DEFAULT_SORT = 'latest';
const RECENT_STUDY_SORT = 'recent-study';

function buildFilterHref(pathname: string, selectedChannel: string | undefined, selectedSort: string): string {
  const params = new URLSearchParams();

  if (selectedChannel) {
    params.set('channel', selectedChannel);
  }

  if (selectedSort !== DEFAULT_SORT) {
    params.set('sort', selectedSort);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function VideosChannelFilter({
  availableChannels,
  selectedChannel,
  selectedSort,
  showRecentStudySort,
  showUnassignedChannel,
  unassignedChannelValue,
}: VideosChannelFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateSearchParams = (nextChannel: string, nextSort: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextChannel) {
      params.set('channel', nextChannel);
    } else {
      params.delete('channel');
    }

    if (nextSort !== DEFAULT_SORT) {
      params.set('sort', nextSort);
    } else {
      params.delete('sort');
    }

    params.delete('page');

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <>
      <div className="grid gap-2 sm:hidden">
        <select
          value={selectedChannel ?? ''}
          onChange={(event) => updateSearchParams(event.target.value, selectedSort)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
        >
          <option value="">전체 채널</option>
          {availableChannels.map((channel) => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
          {showUnassignedChannel && (
            <option value={unassignedChannelValue}>채널 미지정</option>
          )}
        </select>

        {showRecentStudySort && (
          <select
            value={selectedSort}
            onChange={(event) => updateSearchParams(selectedChannel ?? '', event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value={DEFAULT_SORT}>최신업로드</option>
            <option value={RECENT_STUDY_SORT}>최근학습</option>
          </select>
        )}
      </div>

      <div className="hidden space-y-3 sm:block">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buildFilterHref(pathname, undefined, selectedSort)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              !selectedChannel
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
            }`}
          >
            전체
          </Link>
          {availableChannels.map((channel) => (
            <Link
              key={channel}
              href={buildFilterHref(pathname, channel, selectedSort)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedChannel === channel
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              {channel}
            </Link>
          ))}
          {showUnassignedChannel && (
            <Link
              href={buildFilterHref(pathname, unassignedChannelValue, selectedSort)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedChannel === unassignedChannelValue
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              채널 미지정
            </Link>
          )}
        </div>

        {showRecentStudySort && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-500">정렬</span>
            <Link
              href={buildFilterHref(pathname, selectedChannel, DEFAULT_SORT)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedSort === DEFAULT_SORT
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              최신업로드
            </Link>
            <Link
              href={buildFilterHref(pathname, selectedChannel, RECENT_STUDY_SORT)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedSort === RECENT_STUDY_SORT
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              최근학습
            </Link>
          </div>
        )}
      </div>
    </>
  );
}