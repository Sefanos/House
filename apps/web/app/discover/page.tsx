"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHouseSearch } from "@/hooks/spacetime/useHouseSearch";
import { useUserSearch } from "@/hooks/spacetime/useUserSearch";
import { AmbientBackground, HouseBrand, StatusPill } from "@/components/ui/AmbientBackground";

type DiscoverTab = "houses" | "users";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<DiscoverTab>("houses");
  const [housePage, setHousePage] = useState(1);
  const [userPage, setUserPage] = useState(1);

  const houseSearch = useHouseSearch({
    query,
    page: housePage,
    pageSize: 8,
    publicOnly: true
  });
  const userSearch = useUserSearch({
    query,
    page: userPage,
    pageSize: 8
  });

  useEffect(() => {
    setHousePage(1);
    setUserPage(1);
  }, [query]);

  const isHousesTab = activeTab === "houses";
  const activeSearch = isHousesTab ? houseSearch : userSearch;
  const hasResults = activeSearch.results.length > 0;

  return (
    <>
      <AmbientBackground />

      <main
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "2.5rem 1.5rem 6rem",
        }}
      >
        {/* Hero / Brand */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <HouseBrand />
          </div>
          <h1 className="hp-heading" style={{ textAlign: "center", fontSize: "2.4rem" }}>
            Discover <em>spaces</em>
          </h1>
          <p className="hp-subheading" style={{ textAlign: "center" }}>
            Browse public houses and member profiles — no sign-in needed.
          </p>
          <div
            className="hp-form"
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/login"
              style={{
                padding: "0.55rem 1.5rem",
                border: "1px solid var(--hp-border)",
                borderRadius: 999,
                fontSize: "0.82rem",
                color: "var(--hp-text-muted)",
                textDecoration: "none",
                background: "var(--hp-surface)",
                backdropFilter: "blur(12px)",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              style={{
                padding: "0.55rem 1.5rem",
                borderRadius: 999,
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "#fff",
                textDecoration: "none",
                background: "linear-gradient(135deg, var(--hp-accent), var(--hp-accent-dim))",
                boxShadow: "0 4px 16px rgba(91,141,239,0.35)",
                transition: "transform 0.18s, box-shadow 0.18s",
              }}
            >
              Create account
            </Link>
          </div>
        </div>

        {/* Search Card */}
        <div className="hp-card" style={{ maxWidth: 720, marginBottom: "2rem" }}>
          <div className="hp-field" style={{ marginBottom: 0 }}>
            <label htmlFor="discover-query">Search</label>
            <div className="hp-input-wrap">
              <input
                id="discover-query"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search houses, users, bios..."
                className="hp-input"
              />
              <svg className="hp-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "1rem",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("houses")}
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: 10,
                border: "1px solid var(--hp-border)",
                fontSize: "0.82rem",
                fontWeight: isHousesTab ? 500 : 400,
                cursor: "pointer",
                background: isHousesTab
                  ? "linear-gradient(135deg, var(--hp-accent), var(--hp-accent-dim))"
                  : "var(--hp-surface)",
                color: isHousesTab ? "#fff" : "var(--hp-text-muted)",
                transition: "all 0.2s",
                fontFamily: "var(--hp-font-family), sans-serif",
              }}
            >
              Houses ({houseSearch.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              style={{
                padding: "0.5rem 1.2rem",
                borderRadius: 10,
                border: "1px solid var(--hp-border)",
                fontSize: "0.82rem",
                fontWeight: !isHousesTab ? 500 : 400,
                cursor: "pointer",
                background: !isHousesTab
                  ? "linear-gradient(135deg, var(--hp-accent), var(--hp-accent-dim))"
                  : "var(--hp-surface)",
                color: !isHousesTab ? "#fff" : "var(--hp-text-muted)",
                transition: "all 0.2s",
                fontFamily: "var(--hp-font-family), sans-serif",
              }}
            >
              Users ({userSearch.total})
            </button>
          </div>
        </div>

        {/* Results */}
        <div style={{ width: "100%", maxWidth: 720 }}>
          {activeSearch.isLoading ? (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--hp-text-muted)", fontSize: "0.85rem" }}>
              Loading...
            </div>
          ) : null}

          {activeSearch.error ? (
            <div className="hp-error" style={{ textAlign: "center" }}>
              {activeSearch.error}
            </div>
          ) : null}

          {!activeSearch.isLoading && !activeSearch.error && !hasResults ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                color: "var(--hp-text-muted)",
                fontSize: "0.9rem",
                border: "1px solid var(--hp-border)",
                borderRadius: 18,
                background: "var(--hp-surface)",
              }}
            >
              No results found. Try a different query.
            </div>
          ) : null}

          {/* House results */}
          {isHousesTab && hasResults ? (
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {houseSearch.results.map((house) => (
                <div
                  key={house.id}
                  style={{
                    background: "var(--hp-surface)",
                    border: "1px solid var(--hp-border)",
                    borderRadius: 18,
                    padding: "1.4rem",
                    backdropFilter: "blur(16px)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  className="hp-result-card"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, var(--hp-accent), var(--hp-accent-dim))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 10px rgba(91,141,239,0.3)",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                        <path d="M3 12L12 3l9 9v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {house.name}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#5bdb8a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Public
                      </div>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--hp-text-muted)",
                      lineHeight: 1.5,
                      minHeight: "2.4rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {house.description || "A cozy space — come take a peek."}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--hp-border)" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--hp-text-muted)" }}>
                      {new Date(house.createdAt).toLocaleDateString()}
                    </span>
                    <Link
                      href="/login"
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        color: "var(--hp-accent-soft)",
                        textDecoration: "none",
                        transition: "color 0.2s",
                      }}
                    >
                      Sign in to join →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* User results */}
          {!isHousesTab && hasResults ? (
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {userSearch.results.map((user) => (
                <div
                  key={user.id}
                  style={{
                    background: "var(--hp-surface)",
                    border: "1px solid var(--hp-border)",
                    borderRadius: 18,
                    padding: "1.4rem",
                    backdropFilter: "blur(16px)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #667eea, var(--hp-accent))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.displayName}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--hp-text-muted)" }}>
                        @{user.username}
                      </div>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--hp-text-muted)",
                      lineHeight: 1.5,
                      minHeight: "2.4rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {user.bio || "This member keeps their bio mysterious."}
                  </p>
                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--hp-border)" }}>
                    <Link
                      href={`/profile/${user.username}`}
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "0.5rem",
                        borderRadius: 10,
                        border: "1px solid var(--hp-border)",
                        background: "var(--hp-surface)",
                        color: "var(--hp-text)",
                        fontSize: "0.82rem",
                        textDecoration: "none",
                        transition: "background 0.2s",
                        fontFamily: "var(--hp-font-family), sans-serif",
                      }}
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Pagination */}
          {hasResults && activeSearch.totalPages > 1 ? (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
              <Pagination
                page={activeSearch.page}
                totalPages={activeSearch.totalPages}
                onPrevious={
                  isHousesTab
                    ? () => setHousePage((v) => Math.max(1, v - 1))
                    : () => setUserPage((v) => Math.max(1, v - 1))
                }
                onNext={
                  isHousesTab
                    ? () => setHousePage((v) => Math.min(houseSearch.totalPages, v + 1))
                    : () => setUserPage((v) => Math.min(userSearch.totalPages, v + 1))
                }
                hasPreviousPage={activeSearch.hasPreviousPage}
                hasNextPage={activeSearch.hasNextPage}
              />
            </div>
          ) : null}
        </div>
      </main>

      <StatusPill text="Discover public rooms and members" />
    </>
  );
}

type PaginationProps = {
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

function Pagination({ page, totalPages, hasPreviousPage, hasNextPage, onPrevious, onNext }: PaginationProps) {
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: "0.45rem 1rem",
    borderRadius: 999,
    border: "1px solid var(--hp-border)",
    background: "var(--hp-surface)",
    color: disabled ? "rgba(200,215,240,0.2)" : "var(--hp-text)",
    fontSize: "0.82rem",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 0.2s, color 0.2s",
    fontFamily: "var(--hp-font-family), sans-serif",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.3rem",
        borderRadius: 999,
        border: "1px solid var(--hp-border)",
        background: "var(--hp-surface)",
        backdropFilter: "blur(16px)",
      }}
    >
      <button type="button" onClick={onPrevious} disabled={!hasPreviousPage} style={btnStyle(!hasPreviousPage)}>
        ← Prev
      </button>
      <span style={{ fontSize: "0.82rem", color: "var(--hp-text-muted)", padding: "0 0.5rem" }}>
        {page} / {totalPages}
      </span>
      <button type="button" onClick={onNext} disabled={!hasNextPage} style={btnStyle(!hasNextPage)}>
        Next →
      </button>
    </div>
  );
}
