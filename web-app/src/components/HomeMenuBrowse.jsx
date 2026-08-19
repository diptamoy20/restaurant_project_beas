import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { useDispatch } from "react-redux";

import {
  clearError,
} from "../store/slices/cartSlice";
import { useAddToCart } from "../hooks/useAddToCart";

import { getBestSellingMenu } from "../services/menuPublicApi";
import { MenuSlideCard } from "../utils/MenuSlideCard";

const swiperBreakpoints = {
  320: {
    slidesPerView: 1,
    spaceBetween: 12,
  },
  576: {
    slidesPerView: 2,
    spaceBetween: 16,
  },
  768: {
    slidesPerView: 3,
    spaceBetween: 18,
  },
  1024: {
    slidesPerView: 4,
    spaceBetween: 20,
  },
};

export function HomeMenuBrowse({
  restaurantId,
  coordinates,
}) {
  const dispatch = useDispatch();
  const { addItemToCart } = useAddToCart();

  const [bestSelling, setBestSelling] = useState([]);
  const [bestLoading, setBestLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  console.log("restaurantId =", restaurantId);

  useEffect(() => {
    if (!restaurantId) return;

    localStorage.setItem(
      "restaurantId",
      String(restaurantId),
    );

    window.dispatchEvent(
      new Event("restaurantChanged"),
    );
  }, [restaurantId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBestSelling() {
      setBestLoading(true);
      setError("");

      try {
        const response = await getBestSellingMenu({
          lat: coordinates?.lat,
          lng: coordinates?.lng,
          restaurantId,
          limit: 48,
          signal: controller.signal,
        });

        const items = Array.isArray(response)
          ? response
          : [];

        setBestSelling(items);
      } catch (err) {
        if (err?.name !== "AbortError") {
          setError(
            "Unable to load best-selling dishes.",
          );

          setBestSelling([]);
        }
      } finally {
        setBestLoading(false);
      }
    }

    loadBestSelling();

    return () => controller.abort();
  }, [
    coordinates?.lat,
    coordinates?.lng,
    restaurantId,
  ]);

  const handleAddToCart = async (item) => {
    setToast("");
    dispatch(clearError());

    const hasVariants =
      item.variants?.length > 0;

    const hasAddons =
      item.addonGroups?.some(
        (group) =>
          group.options?.length > 0,
      );

    if (hasVariants || hasAddons) {
      setToast(
        "Open the full menu to customize this dish before adding it.",
      );

      window.setTimeout(() => {
        setToast("");
      }, 3200);

      return;
    }

    const added = await addItemToCart(
      item,
      null,
      [],
      1,
    );

    if (added) {
      setToast(
        `${item.name} added to cart`,
      );

      window.setTimeout(() => {
        setToast("");
      }, 2600);
    }
  };

  if (bestLoading) {
    return (
      <section className="home-menu-browse">
        <p className="eyebrow">
          Loading best sellers...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="home-menu-browse">
        <p className="order-status-banner error">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="home-menu-browse">
      {toast ? (
        <div className="order-status-banner success">
          {toast}
        </div>
      ) : null}

      <div className="menu-carousel-block">
        <div className="menu-carousel-heading">
          <h3>
            {restaurantId
              ? "Restaurant Best Sellers"
              : "Popular Dishes Near You"}
          </h3>
        </div>

        {!bestLoading &&
        bestSelling.length === 0 ? (
          <p className="copy-muted">
            No best-selling dishes available
            right now
          </p>
        ) : null}

        {bestSelling.length > 0 ? (
          <Swiper
            key={`best-${
              restaurantId || "all"
            }`}
            modules={[
              Navigation,
              Pagination,
              Autoplay,
            ]}
            autoplay={{
              delay: 2500,
              disableOnInteraction: false,
            }}
            loop={bestSelling.length > 4}
            breakpoints={
              swiperBreakpoints
            }
            className="menu-swiper"
          >
            {bestSelling.map((item) => (
              <SwiperSlide
                key={`best-${item.id}`}
              >
                <MenuSlideCard
                  item={item}
                  onAdd={() =>
                    handleAddToCart(item)
                  }
                  subtitle={
                    item.restaurant?.name
                  }
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : null}
      </div>
    </section>
  );
}