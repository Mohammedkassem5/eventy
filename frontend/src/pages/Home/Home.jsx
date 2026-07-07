import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { FiSearch } from "react-icons/fi";
import "swiper/css";
import "swiper/css/pagination";
import { categoryApi } from "../../services/categoryApi";
import { eventApi } from "../../services/eventApi";
import { mediaUrl } from "../../lib/api";
import EventCard from "../../components/EventCard/EventCard";
import Loader from "../../components/Loader/Loader";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: categoryApi.list,
  });

  const { data: featured, isLoading: featLoading } = useQuery({
    queryKey: ["events", "featured"],
    queryFn: () => eventApi.list({ featured: 1 }),
  });

  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/events?q=${encodeURIComponent(q.trim())}` : "/events");
  };

  return (
    <>
      <section className="hero">
        <img
          className="hero__bg"
          src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1280&q=55"
          alt=""
          fetchpriority="high"
          decoding="async"
        />
        <div className="hero__shade" />
        <div className="hero__card">
          <span className="hero__eyebrow">PREMIUM EXPERIENCE</span>
          <h1 className="hero__title">
            أهلاً بك في <span className="hero__brand">Eventy</span>
          </h1>
          <p className="hero__subtitle">
            اكتشف واحجز لأجمل تذاكر الفعاليات الترفيهية لعام 2026 بكل سهولة وأمان.
          </p>

          <form className="hero__search" onSubmit={submit}>
            <span className="hero__search-icon"><FiSearch /></span>
            <input
              className="hero__search-input"
              type="text"
              placeholder="ما هي الفعالية التي تبحث عنها؟"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" className="hero__search-btn">اكتشف</button>
          </form>
        </div>
      </section>

      {/* فعاليات مهمة — Swiper (يتحكم بها الأدمن عبر is_featured) */}
      {featLoading ? (
        <div className="container"><Loader label="جارٍ تحميل الأبرز..." /></div>
      ) : featured?.length ? (
        <section className="container featured">
          <div className="featured__head">
            <h2 className="featured__title">🔥 الأبرز الآن</h2>
          </div>
          <Swiper
            dir="rtl"
            modules={[Autoplay, Pagination]}
            spaceBetween={20}
            slidesPerView={1.1}
            autoplay={{ delay: 3500, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            breakpoints={{
              560: { slidesPerView: 1.6 },
              768: { slidesPerView: 2.2 },
              1024: { slidesPerView: 3 },
            }}
            className="featured__swiper"
          >
            {featured.map((ev) => (
              <SwiperSlide key={ev.id}>
                <EventCard event={ev} aos="" />
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
      ) : null}

      {/* أنواع الفعاليات — ديناميكي من الـ API */}
      <section className="container cats">
        <div className="cats__head">
          <h2 className="cats__title">أنواع الفعاليات</h2>
        </div>

        {catsLoading ? (
          <Loader label="جارٍ تحميل الفئات..." />
        ) : categories?.length ? (
          <div className="cats__grid">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/events?category=${c.slug}`}
                className="cat-card"
                data-aos="zoom-in"
              >
                <div className="cat-card__media">
                  {c.image ? (
                    <img src={mediaUrl(c.image)} alt={c.name_ar} loading="lazy" decoding="async" />
                  ) : (
                    <span className="cat-card__icon">{c.icon || "🎟️"}</span>
                  )}
                </div>
                <span className="cat-card__name">{c.name_ar}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
