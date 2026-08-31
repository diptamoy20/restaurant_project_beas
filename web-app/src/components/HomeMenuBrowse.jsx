import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { useDispatch } from "react-redux";

import { clearError } from "../store/slices/cartSlice";
import { useAddToCart } from "../hooks/useAddToCart";
import { useItemCustomizer } from "../hooks/useItemCustomizer";
import { ItemCustomizerModal } from "./ItemCustomizerModal";

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

export function HomeMenuBrowse({ restaurantId, coordinates }) {
  const dispatch = useDispatch();
  const { addItemToCart } = useAddToCart();

  const [bestSelling, setBestSelling] = useState([]);
  const [bestLoading, setBestLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

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

        const items = Array.isArray(response) ? response : [];

        setBestSelling(items);
      } catch (err) {
        if (err?.name !== "AbortError") {
          setError("Unable to load best-selling dishes.");
          setBestSelling([]);
        }
      } finally {
        setBestLoading(false);
      }
    }

    loadBestSelling();

    return () => controller.abort();
  }, [coordinates?.lat, coordinates?.lng, restaurantId]);

  const handleAddToCart = async (
    item,
    variant = null,
    addOns = [],
    quantity = 1,
  ) => {
    setToast("");
    dispatch(clearError());

    const added = await addItemToCart(item, variant, addOns, quantity);

    if (added) {
      setToast(`${item.name} added to cart`);

      window.setTimeout(() => {
        setToast("");
      }, 2600);
    }
  };

  const customizer = useItemCustomizer({ addToCart: handleAddToCart });

  const handleAddOrCustomize = (item) => {
    if (customizer.hasCustomization(item)) {
      customizer.open(item);
      return;
    }

    handleAddToCart(item);
  };

  if (bestLoading) {
    return (
      <section className="home-menu-browse">
        <p className="eyebrow">Loading best sellers...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="home-menu-browse">
        <p className="order-status-banner error">{error}</p>
      </section>
    );
  }

  return (
    <section className="home-menu-browse">
      {toast ? (
        <div className="order-status-banner success">{toast}</div>
      ) : null}

      <div className="menu-carousel-block">
        <div className="menu-carousel-heading">
          <h3>
            {restaurantId ? "Restaurant Best Sellers" : "Popular Dishes Near You"}
          </h3>

          {/* <p>
            {bestLoading
              ? "Loading..."
              : `${bestSelling.length} best-selling dishes`}
          </p> */}
        </div>

        {!bestLoading && bestSelling.length === 0 ? (
          <p className="copy-muted">
            No best-selling dishes available right now
          </p>
        ) : null}

        {bestSelling.length > 0 ? (
          <Swiper
            key={`best-${restaurantId || "all"}`}
            modules={[Navigation, Pagination, Autoplay]}
            // navigation
            // pagination={{
            //   clickable: true,
            // }}
            autoplay={{
              delay: 2500,
              disableOnInteraction: false,
            }}
            loop={bestSelling.length > 4}
            breakpoints={swiperBreakpoints}
            className="menu-swiper"
          >
            {bestSelling.map((item) => (
              <SwiperSlide key={`best-${item.id}`}>
                <MenuSlideCard
                  item={item}
                  onAdd={() => handleAddOrCustomize(item)}
                  subtitle={item.restaurant?.name}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : null}
      </div>

      <ItemCustomizerModal {...customizer} />
    </section>
  );
}
