import React from "react";
import { ViewKey } from "./page";
import { FaPlus, FaEye, FaBolt } from "react-icons/fa";
import { BsMusicNoteList } from "react-icons/bs";
import { MdCampaign } from "react-icons/md";

interface Props {
  onNavigate: (view: ViewKey) => void;
}

export default function MediaManagementOverview({ onNavigate }: Props) {
  return (
    <div className="store-media-overview-view">
      {/* Media Playlist Section */}
      <div className="store-media-section">
        <div className="store-media-section__header">
          <div className="store-media-section__icon-wrap">
            <BsMusicNoteList size={18} />
          </div>
          <div>
            <h2 className="store-media-section__title">Media playlist</h2>
            <p className="store-media-section__subtitle">Create and manage video and audio content</p>
          </div>
        </div>
        <div className="store-media-cards">
          <div className="store-media-option-card">
            <div className="store-media-option-card__icon store-media-option-card__icon--orange">
              <FaPlus size={14} />
            </div>
            <h3>Create new playlist</h3>
            <p>Start building a new media playlist from scratch</p>
            <button
              className="store-media-option-btn store-media-option-btn--orange"
              onClick={() => onNavigate("createMediaPlaylist")}
            >
              Create playlist
            </button>
          </div>
          <div className="store-media-option-card">
            <div className="store-media-option-card__icon store-media-option-card__icon--teal">
              <FaEye size={16} />
            </div>
            <h3>View playlist</h3>
            <p>Browse and manage all existing media playlist</p>
            <button
              className="store-media-option-btn store-media-option-btn--orange"
              // Add a generic 'viewPlaylists' or just 'viewAllCampaigns' as fallback for now
              onClick={() => onNavigate("viewAllCampaigns")}
            >
              View playlist
            </button>
          </div>
          <div className="store-media-option-card">
            <div className="store-media-option-card__icon store-media-option-card__icon--orange">
              <FaBolt size={14} />
            </div>
            <h3>Instant playlist</h3>
            <p>Quick access to create instant playlist</p>
            <button
              className="store-media-option-btn store-media-option-btn--orange"
              onClick={() => onNavigate("instantPlaylist")}
            >
              Instant playlist
            </button>
          </div>
        </div>
      </div>

      {/* Announcement Playlist Section */}
      <div className="store-media-section">
        <div className="store-media-section__header">
          <div className="store-media-section__icon-wrap">
            <MdCampaign size={20} />
          </div>
          <div>
            <h2 className="store-media-section__title">Announcement playlist</h2>
            <p className="store-media-section__subtitle">Broadcast important messages and notifications</p>
          </div>
        </div>
        <div className="store-media-cards">
          <div className="store-media-option-card">
            <div className="store-media-option-card__icon store-media-option-card__icon--orange">
              <FaPlus size={14} />
            </div>
            <h3>Create announcements</h3>
            <p>Design new announcement campaigns and messages</p>
            <button
              className="store-media-option-btn store-media-option-btn--orange"
              onClick={() => onNavigate("createAnnouncement")}
            >
              Create announcements
            </button>
          </div>
          <div className="store-media-option-card">
            <div className="store-media-option-card__icon store-media-option-card__icon--teal">
              <FaEye size={16} />
            </div>
            <h3>View announcements</h3>
            <p>Review and manage existing announcements</p>
            <button
              className="store-media-option-btn store-media-option-btn--orange"
              onClick={() => onNavigate("viewAllCampaigns")}
            >
              View announcements
            </button>
          </div>
          <div className="store-media-option-card">
            <div className="store-media-option-card__icon store-media-option-card__icon--orange">
              <FaBolt size={14} />
            </div>
            <h3>Instant announcements</h3>
            <p>Send urgent messages using instant announcements</p>
            <button
              className="store-media-option-btn store-media-option-btn--orange"
              onClick={() => onNavigate("createInstantAnnouncement")}
            >
              Instant announcements
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .store-media-overview-view {
          display: flex; flex-direction: column; gap: 24px;
        }
        .store-media-section {
          background: #fff; border-radius: 12px; overflow: hidden;
          border: 1px solid #D6E6E9;
        }
        .store-media-section__header {
          display: flex; align-items: center; gap: 16px;
          background: #0B2830; padding: 18px 24px;
        }
        .store-media-section__icon-wrap {
          width: 42px; height: 42px; border-radius: 8px;
          background: rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
        }
        .store-media-section__title { font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 2px; }
        .store-media-section__subtitle { font-size: 0.8rem; color: #8CABB3; }

        .store-media-cards {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
        }
        @media (max-width: 800px) {
          .store-media-cards { grid-template-columns: 1fr; }
        }

        .store-media-option-card {
          padding: 32px 24px; border-right: 1px solid #EAEFEF; text-align: center;
          display: flex; flex-direction: column; align-items: center;
        }
        .store-media-option-card:last-child { border-right: none; }
        @media (max-width: 800px) {
          .store-media-option-card { border-right: none; border-bottom: 1px solid #EAEFEF; }
          .store-media-option-card:last-child { border-bottom: none; }
        }

        .store-media-option-card__icon {
          width: 48px; height: 48px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .store-media-option-card__icon--orange { background: #FFF2F2; color: #F05A28; }
        .store-media-option-card__icon--teal { background: #EAF6F8; color: #11B5BB; }

        .store-media-option-card h3 { font-size: 1.05rem; font-weight: 700; color: #162B30; margin-bottom: 8px; }
        .store-media-option-card p { font-size: 0.82rem; color: #64848D; line-height: 1.5; margin-bottom: 24px; }

        .store-media-option-btn {
          margin-top: auto; padding: 10px 24px; border-radius: 8px; border: none; cursor: pointer;
          font-size: 0.88rem; font-weight: 600; font-family: inherit; transition: all 0.15s;
          width: 100%; max-width: 200px;
        }
        .store-media-option-btn--orange { background: #F05A28; color: #fff; }
        .store-media-option-btn--orange:hover { background: #DC4B1D; }
      `}</style>
    </div>
  );
}
