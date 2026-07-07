import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { categoryApi } from "../../services/categoryApi";
import { eventApi } from "../../services/eventApi";
import EventCard from "../../components/EventCard/EventCard";
import Loader from "../../components/Loader/Loader";
import "./Events.css";

export default function Events() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const q = params.get("q") || "";

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoryApi.list,
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", { category, q }],
    queryFn: () => eventApi.list({ category: category || undefined, q: q || undefined }),
  });

  const setCategory = (slug) => {
    const next = new URLSearchParams(params);
    if (slug) next.set("category", slug);
    else next.delete("category");
    setParams(next);
  };

  const activeCat = categories?.find((c) => c.slug === category);

  return (
    <div className="container events-page">
      <h1 className="events-page__title">
        {activeCat ? `${activeCat.icon} ${activeCat.name_ar}` : q ? `نتائج: ${q}` : "كل الفعاليات"}
      </h1>

      <div className="events-page__chips">
        <button
          className={`chip ${!category ? "chip--on" : ""}`}
          onClick={() => setCategory("")}
        >
          الكل
        </button>
        {categories?.map((c) => (
          <button
            key={c.id}
            className={`chip ${category === c.slug ? "chip--on" : ""}`}
            onClick={() => setCategory(c.slug)}
          >
            {c.icon} {c.name_ar}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loader label="جارٍ تحميل الفعاليات..." />
      ) : events?.length ? (
        <div className="events-page__grid">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      ) : (
        <p className="events-page__empty text-muted">لا توجد فعاليات مطابقة حاليًا.</p>
      )}
    </div>
  );
}
