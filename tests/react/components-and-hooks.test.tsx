import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { InstagramMedia, InstagramProfile } from "@instaconnect/core";
import {
  InstagramConnectButton,
  InstagramFeed,
  InstagramGrid,
  InstagramProfile as InstagramProfileComponent,
  InstagramProvider,
  InstagramReels
} from "@instaconnect/react";

const SAMPLE_MEDIA: InstagramMedia[] = [
  {
    id: "m1",
    caption: "First sample image post",
    mediaType: "IMAGE",
    mediaProductType: "FEED",
    mediaUrl: "https://scontent.cdninstagram.com/v/m1.jpg",
    permalink: "https://www.instagram.com/p/m1/",
    timestamp: "2026-10-10T10:00:00Z",
    children: [],
    isReel: false,
    isCarousel: false
  },
  {
    id: "m2",
    caption: "Sample vertical Reel video",
    mediaType: "VIDEO",
    mediaProductType: "REELS",
    mediaUrl: "https://scontent.cdninstagram.com/v/m2.mp4",
    thumbnailUrl: "https://scontent.cdninstagram.com/v/m2_thumb.jpg",
    permalink: "https://www.instagram.com/reel/m2/",
    timestamp: "2026-10-11T10:00:00Z",
    children: [],
    isReel: true,
    isCarousel: false
  },
  {
    id: "m3",
    caption: "Carousel album post",
    mediaType: "CAROUSEL_ALBUM",
    mediaProductType: "FEED",
    mediaUrl: "https://scontent.cdninstagram.com/v/c1.jpg",
    permalink: "https://www.instagram.com/p/m3/",
    timestamp: "2026-10-12T10:00:00Z",
    children: [
      {
        id: "c1",
        mediaType: "IMAGE",
        mediaUrl: "https://scontent.cdninstagram.com/v/c1.jpg"
      },
      {
        id: "c2",
        mediaType: "IMAGE",
        mediaUrl: "https://scontent.cdninstagram.com/v/c2.jpg"
      }
    ],
    isReel: false,
    isCarousel: true
  }
];

const SAMPLE_PROFILE: InstagramProfile = {
  id: "1784140999",
  username: "creator.studio",
  accountType: "MEDIA_CREATOR",
  mediaCount: 128,
  followersCount: 9400,
  biography: "Digital Creator & Filmmaker"
};

describe("@instaconnect/react - Components & Hooks", () => {
  it("renders InstagramGrid with IMAGE, REEL, and CAROUSEL items and supports carousel navigation", () => {
    render(<InstagramGrid media={SAMPLE_MEDIA} columns={3} showCaptions />);

    expect(screen.getByText("First sample image post")).toBeInTheDocument();
    expect(screen.getByText("Sample vertical Reel video")).toBeInTheDocument();
    expect(screen.getByText("CAROUSEL (1/2)")).toBeInTheDocument();

    const nextBtn = screen.getByLabelText("Next carousel item");
    fireEvent.click(nextBtn);
    expect(screen.getByText("CAROUSEL (2/2)")).toBeInTheDocument();
  });

  it("fetches and renders InstagramFeed via InstagramProvider fetcher", async () => {
    const customFetcher = vi.fn(async () => ({
      data: SAMPLE_MEDIA,
      paging: {
        cursors: { after: "NEXT_CURSOR" },
        hasNextPage: true,
        hasPreviousPage: false
      }
    }));

    render(
      <InstagramProvider fetcher={customFetcher as never}>
        <InstagramFeed limit={3} showCaptions showReels showLoadMore />
      </InstagramProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("First sample image post")).toBeInTheDocument();
    });
    expect(screen.getByText("Load More")).toBeInTheDocument();
  });

  it("renders InstagramProfile with username, badge, media count, and bio", () => {
    render(
      <InstagramProfileComponent
        profile={SAMPLE_PROFILE}
        showAvatar
        showUsername
        showMediaCount
        showBio
      />
    );

    expect(screen.getByText("@creator.studio")).toBeInTheDocument();
    expect(screen.getByText("MEDIA_CREATOR")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("Digital Creator & Filmmaker")).toBeInTheDocument();
  });

  it("renders InstagramReels with video items", () => {
    render(<InstagramReels media={SAMPLE_MEDIA.filter((m) => m.isReel)} limit={3} />);
    expect(screen.getByText("Sample vertical Reel video")).toBeInTheDocument();
  });

  it("triggers onConnect callback when InstagramConnectButton is clicked", () => {
    const onConnect = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: vi.fn() }
    });

    render(<InstagramConnectButton onConnect={onConnect} label="Connect IG" />);

    const btn = screen.getByRole("button", { name: /Connect IG/i });
    fireEvent.click(btn);
    expect(onConnect).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation
    });
  });
});

