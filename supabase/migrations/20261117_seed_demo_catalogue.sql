-- ==============================================================================
-- Seed Migration: FoodWise Demo Food Catalogue & Restaurants
-- PREPARED FOR REVIEW ONLY - DO NOT EXECUTE DIRECTLY WITHOUT OPERATOR APPROVAL
-- ==============================================================================

-- 1. Seed Restaurants
INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('bfba2a68-fad0-5e80-b884-7650861d1a7e', 'rest-paradise-biryani', 'Paradise Biryani Palace', 'Mughlai / Hyderabadi', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('a74eeeb8-6181-57c8-bad2-9fdce1de4662', 'rest-behrouz-royal-biryani', 'Behrouz Royal Biryani', 'Awadhi / Lucknowi', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('f40f0622-165d-5782-8835-3cae43f0dbc5', 'rest-arsalan-restaurant', 'Arsalan Restaurant', 'Bengali / Mughlai', 4.6, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('7979128a-ed50-53aa-b256-1b95bea9c731', 'rest-bikkgane-biryani-house', 'Bikkgane Biryani House', 'North Indian', 4.3, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('42bab88e-925b-5bd9-a106-4cf134b3517d', 'rest-dhabawala-comfort-bowls', 'Dhabawala Comfort Bowls', 'North Indian', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('570fa829-6903-5a53-b9ab-98176155e591', 'rest-bawarchi-biryani-central', 'Bawarchi Biryani Central', 'Hyderabadi', 4.2, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('500a1865-cceb-54e3-8952-b5cb632410a3', 'rest-la-pino-z-pizza-central', 'La Pino''z Pizza Central', 'Italian / Fusion', 4.3, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('f4a5563a-2af2-5333-a459-f6fcc77c4084', 'rest-ovenstory-gourmet-pizza', 'Ovenstory Gourmet Pizza', 'Italian', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('f49dc9e1-8c91-5c93-8f4a-cf47dc03d6e3', 'rest-pizza-hut-express', 'Pizza Hut Express', 'Italian', 4.1, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('c7844e92-5aaa-55e1-b336-917d72bb6b66', 'rest-domino-s-gourmet-bistro', 'Domino''s Gourmet Bistro', 'American / Italian', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('efb2e03a-1678-5c78-bbf1-424c0b6470da', 'rest-mojo-pizza-crust-hub', 'Mojo Pizza Crust Hub', 'Italian / Fusion', 4.3, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('69603b01-9153-5b84-a450-cfe98654c926', 'rest-tossin-woodfired-pizza', 'Tossin Woodfired Pizza', 'Italian', 4.2, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('3f8f39a7-1af1-53ee-85d8-885b922c9987', 'rest-burger-king-express', 'Burger King Express', 'American / Street', 4.2, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('084ad31b-10b1-557a-a823-dbe63189c4f2', 'rest-wendy-s-burgers', 'Wendy''s Burgers', 'American', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('13bf5db8-2d8f-55e6-b31b-be3b4c879c41', 'rest-the-burger-club', 'The Burger Club', 'American', 4.6, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('785cefaf-68d2-585c-a257-5652aa992a87', 'rest-burger-king-flagship', 'Burger King Flagship', 'American', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('77a78ef1-fad9-5c5b-a1ae-a9e18eea28f2', 'rest-truffles-cafe-burgers', 'Truffles Cafe & Burgers', 'Continental', 4.7, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('cc372def-9658-5674-8f80-0ef4adc6c2b2', 'rest-mcdonald-s-gourmet', 'McDonald''s Gourmet', 'American', 4.3, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('c9cf0c2a-131e-5197-a6dd-5995a37a9592', 'rest-prasuma-momos-more', 'Prasuma Momos & More', 'Tibetan / Asian', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('407bb834-aa78-5339-8c63-2d22b4864fa3', 'rest-momo-i-am-himalayan-diner', 'Momo I Am Himalayan Diner', 'Tibetan / Asian', 4.6, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('be5ec783-8109-5564-9c0e-80d728141b16', 'rest-wow-momo-express', 'Wow! Momo Express', 'Tibetan / Indo-Chinese', 4.2, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('4c32ff82-c080-5e7a-8674-50ef97550222', 'rest-momo-zone-corner', 'Momo Zone Corner', 'Street Fusion', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('78011f0d-d06f-5520-b582-3daff069c15c', 'rest-kingdom-of-momos', 'Kingdom of Momos', 'Tandoori Fusion', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('1db6d01b-ae5f-5cf5-84c5-f3328fa37db5', 'rest-the-momo-hut', 'The Momo Hut', 'Mughlai Fusion', 4.3, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('78986ffe-785e-5c4f-88e2-1d4bf4b3c5f8', 'rest-mainland-china-express', 'Mainland China Express', 'Indo-Chinese', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('b94c1cb1-d9ff-5d2e-995c-c70dbcd879a3', 'rest-wok-express-bowls', 'Wok Express Bowls', 'Indo-Chinese', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('30ecac50-f4d4-5260-b4b0-7b279bdb7a7c', 'rest-berco-s-chinese-thai', 'Berco''s Chinese & Thai', 'Indo-Chinese', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('b55a0f0d-9a8f-5429-bf65-417860ac0f65', 'rest-chowman-chinese-wok', 'Chowman Chinese Wok', 'Indo-Chinese', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('44227cb4-7bb7-5e7c-afa2-84e51fed3629', 'rest-asia-seven-bites', 'Asia Seven Bites', 'Asian / Chinese', 4.2, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('c3b99cc5-f873-5ccb-ba42-707847c4ae80', 'rest-vidyarthi-bhavan-tiffins', 'Vidyarthi Bhavan Tiffins', 'South Indian', 4.7, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('ef856dd5-cd43-5170-afc1-7b5e925d0c38', 'rest-a2b-adyar-ananda-bhavan', 'A2B - Adyar Ananda Bhavan', 'South Indian', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('a4d6dac0-b04c-5c77-be78-f5272197c3cf', 'rest-mtr-1924-heritage-tiffins', 'MTR 1924 Heritage Tiffins', 'South Indian', 4.6, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('55d8b630-8012-58be-96bc-007dfe142f82', 'rest-saravana-bhavan-tiffins', 'Saravana Bhavan Tiffins', 'South Indian', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('1367d3b1-5089-516a-8bc9-137f624fb319', 'rest-sagar-ratna-sweets-meals', 'Sagar Ratna Sweets & Meals', 'South Indian', 4.3, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('4eb1efc0-9b42-5b14-86fb-c5b1465d2f66', 'rest-punjab-grill-express', 'Punjab Grill Express', 'North Indian', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('a3997796-97fc-5023-827c-48882be14298', 'rest-dhaba-by-claridges', 'Dhaba By Claridges', 'North Indian / Punjabi', 4.6, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('2ccbe748-5d29-5f18-ba00-c0b8357f4e1e', 'rest-moti-mahal-delux-heritage', 'Moti Mahal Delux Heritage', 'North Indian / Mughlai', 4.6, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('b494fcf9-7a79-5322-a2cb-823fc32a2700', 'rest-haldiram-s-restaurant', 'Haldiram''s Restaurant', 'North Indian / Mughlai', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('06863cb6-4b52-557a-881b-a1d87df145dc', 'rest-bikanervala-thali-express', 'Bikanervala Thali Express', 'North Indian', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('25989bcf-86b1-5280-99bf-1f0bd7186b6e', 'rest-sita-ram-diwan-chand', 'Sita Ram Diwan Chand', 'Punjabi', 4.6, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('6b0fb9fe-f2b5-5dbe-a226-eb59cf257132', 'rest-third-wave-roastworks', 'Third Wave Roastworks', 'Cafe', 4.6, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('d55905ac-243b-52b0-9c12-ba79837cd97a', 'rest-cafe-coffee-day-bites', 'Cafe Coffee Day Bites', 'Cafe', 4.2, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('318047e5-85a0-5df7-9d63-8c9449005b58', 'rest-starbucks-gourmet-coffee', 'Starbucks Gourmet Coffee', 'Cafe', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('4fac629a-2f45-58bc-8b5f-a5a156fa5029', 'rest-amritsari-lassi-corner', 'Amritsari Lassi Corner', 'North Indian', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('847a42c3-063a-544b-933d-f45774fb5157', 'rest-the-thickshake-factory', 'The ThickShake Factory', 'Dessert Drinks', 4.3, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('d1cbc33f-e24d-55a1-a254-feb968621759', 'rest-chaayos-desi-chai-hub', 'Chaayos Desi Chai Hub', 'Indian Hot Drinks', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('fdd534ca-37d2-5ff6-8da2-9e44c9f1884c', 'rest-haldiram-s-sweets', 'Haldiram''s Sweets', 'Indian Sweets', 4.6, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('63f4c426-528b-585f-a55e-5ce688d9c2e2', 'rest-theobroma-patisserie', 'Theobroma Patisserie', 'Bakery / Desserts', 4.7, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('3dec8fe4-57a5-52c3-b215-5a18ff820629', 'rest-kanti-sweets-mithai', 'Kanti Sweets & Mithai', 'Bengali Sweets', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('9eb775b4-a5e1-5ac5-bcf9-40fc0b33a3b4', 'rest-corner-house-ice-cream', 'Corner House Ice Cream', 'Desserts / Ice Cream', 4.8, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('87b4c082-3526-587e-99c9-aa07ac7874c7', 'rest-san-churro-chocolateria', 'San Churro Chocolateria', 'Spanish / Desserts', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('9965d02c-587c-5742-91b0-7d07f20ade28', 'rest-bikanervala-chaat-bazaar', 'Bikanervala Chaat Bazaar', 'North Indian Street Food', 4.5, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('add174df-9fe1-541b-ab5e-a4e09db4ba60', 'rest-chaat-chowk-express', 'Chaat Chowk Express', 'Indian Street Food', 4.3, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('3c5783a7-ea70-569d-985f-a996ef60d9f4', 'rest-kusum-rolls-kolkata', 'Kusum Rolls Kolkata', 'Kolkata Street Food', 4.6, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('fcd523d5-1b0c-5bb1-966c-4c353428de4b', 'rest-pind-balluchi-tandoor', 'Pind Balluchi Tandoor', 'Tandoori / North Indian', 4.4, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;

INSERT INTO public.restaurants (id, slug, name, cuisine, rating, city, is_brand)
VALUES ('ad648697-34c0-5032-a573-500602bc77db', 'rest-burger-king-snacks', 'Burger King Snacks', 'American Fast Food', 4.3, 'Bengaluru', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, rating = EXCLUDED.rating;


-- 2. Seed Food Items with Stable Catalogue UUIDs
INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('09b52c75-da15-585f-9d5a-44f91f28f4c4', 'bfba2a68-fad0-5e80-b884-7650861d1a7e', 'biryani-hyd-1', 'Hyderabadi Chicken Dum Biryani', 'Biryani & Rice', 'Mughlai / Hyderabadi', 'non-veg', 'Slow-cooked fragrant basmati rice with tender marinated chicken pieces, infused with saffron and secret spices. Served with Mirchi ka Salan and Raita.', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('8ddccfb9-8c6f-57c7-abd1-7ede06e50885', 'a74eeeb8-6181-57c8-bad2-9fdce1de4662', 'biryani-luck-2', 'Lucknowi Murgh Awadhi Biryani', 'Biryani & Rice', 'Awadhi / Lucknowi', 'non-veg', 'Delicately spiced aromatic Awadhi chicken biryani cooked on slow dum with kewra water, rose essence, and saffron-glazed basmati grains.', 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('e4e66af9-0108-556b-9f48-ad7246f9a911', 'f40f0622-165d-5782-8835-3cae43f0dbc5', 'biryani-kolk-3', 'Kolkata Chicken Biryani with Aloo & Egg', 'Biryani & Rice', 'Bengali / Mughlai', 'non-veg', 'Iconic Kolkata-style biryani featuring slow-cooked soft potato, boiled egg, and juicy chicken piece with subtle meetha ittar aroma.', 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('2a5efc26-885c-59ae-9a79-ffb6f642c201', '7979128a-ed50-53aa-b256-1b95bea9c731', 'biryani-veg-4', 'Royal Subz Paneer Dum Biryani', 'Biryani & Rice', 'North Indian', 'veg', 'Layers of premium basmati rice, charred cottage cheese cubes, cauliflower florets, and French beans in royal shahi spices. Served with boondi raita.', 'https://images.unsplash.com/photo-1642821373181-696a54913e9a?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('6b0e4165-1ee6-5344-aa22-9612cad2a465', '42bab88e-925b-5bd9-a106-4cf134b3517d', 'rice-jeera-dal-5', 'Dal Tadka with Steamed Jeera Basmati Rice', 'Biryani & Rice', 'North Indian', 'veg', 'Yellow arhar lentils tempered with cumin, garlic, and dried red chilies, paired with hot ghee-glazed jeera rice.', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('96a4a514-21a8-5a3d-831c-37bea5ed3f3c', '570fa829-6903-5a53-b9ab-98176155e591', 'biryani-egg-6', 'Hyderabadi Spiced Double Egg Biryani', 'Biryani & Rice', 'Hyderabadi', 'egg', 'Two golden pan-fried boiled eggs nestled in fragrant saffron-infused dum basmati rice with spicy salan gravy.', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('63f4972d-07fc-520d-bec9-38bba2f2cad9', '500a1865-cceb-54e3-8952-b5cb632410a3', 'pizza-paneer-7', 'Spicy Paneer Tikka Makhani Pizza', 'Pizza & Italian', 'Italian / Fusion', 'veg', 'Hand-stretched crust topped with rich makhani sauce, diced paneer tikka, crisp capsicum, red onions, and 100% mozzarella cheese.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('0421b445-37db-59af-b7df-5b069b02a298', 'f4a5563a-2af2-5333-a459-f6fcc77c4084', 'pizza-cheese-farm-8', 'Farmhouse Special Cheese Burst Pizza', 'Pizza & Italian', 'Italian', 'veg', 'Crisp crust filled with liquid cheese, loaded with fresh tomatoes, crunchy bell peppers, sweet corn kernels, and black olives.', 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('18675cdd-22cc-5c58-b19c-babfbdde0268', 'f49dc9e1-8c91-5c93-8f4a-cf47dc03d6e3', 'pizza-margherita-9', 'Classic Italian Margherita Single Pizza', 'Pizza & Italian', 'Italian', 'veg', 'Traditional thin Italian crust layered with San Marzano herb tomato sauce, fresh basil leaves, and bubbling mozzarella.', 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('02b5cb93-8198-5860-9355-783fdd3b894a', 'c7844e92-5aaa-55e1-b336-917d72bb6b66', 'pizza-chicken-bbq-10', 'Smoky BBQ Chicken Feast Pizza', 'Pizza & Italian', 'American / Italian', 'non-veg', 'Smoky barbecue chicken chunks, caramelized onions, jalapeños, and melted cheddar and mozzarella blend on golden hand-tossed dough.', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('3fb002b8-891f-5430-9b28-7945b1769c1a', 'efb2e03a-1678-5c78-bbf1-424c0b6470da', 'pizza-paneer-makhani-11', 'Paneer Makhani & Capsicum Thin Crust Pizza', 'Pizza & Italian', 'Italian / Fusion', 'veg', 'Ultra-thin crust smothered in butter gravy with spiced cottage cheese cubes, green bell peppers, and oregano flakes.', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('6a8e4040-d2c8-5b16-ada9-6cd5aefd1e0c', '69603b01-9153-5b84-a450-cfe98654c926', 'pizza-corn-cheese-12', 'Golden Sweet Corn & Double Cheese Pizza', 'Pizza & Italian', 'Italian', 'veg', 'Sweet American corn tossed with garlic butter and blanketed under a thick layer of melted gouda and mozzarella.', 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('443d97e3-2882-5e1c-8217-20eef37af022', '3f8f39a7-1af1-53ee-85d8-885b922c9987', 'burger-veg-aloo-13', 'Crispy Veg Aloo Tikki Burger', 'Burgers & Fast Food', 'American / Street', 'veg', 'Spiced potato and peas patty fried to golden crispness, topped with onion rings, tomato slice, and creamy eggless mayonnaise in a sesame seed bun.', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('1fb834c6-419f-599f-b6e1-26858da77e43', '084ad31b-10b1-557a-a823-dbe63189c4f2', 'burger-paneer-melt-14', 'Crunchy Paneer Melt Burger with Peri Peri Fries', 'Burgers & Fast Food', 'American', 'veg', 'Golden crumb-fried spicy paneer patty with molten cheese sauce, crisp iceberg lettuce, and peri peri seasoned crinkle fries.', 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('8d09368d-f3d0-501f-9016-5887a71580f5', '13bf5db8-2d8f-55e6-b31b-be3b4c879c41', 'burger-chicken-smash-15', 'Crispy Gourmet Chicken Smash Burger', 'Burgers & Fast Food', 'American', 'non-veg', 'Crispy fried chicken breast fillet glazed with spicy peri-peri mayo, melted cheddar, lettuce, and pickled gherkins on toasted brioche.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('f845e01f-4448-5468-bbc1-8171fa938a3e', '785cefaf-68d2-585c-a257-5652aa992a87', 'burger-chicken-whopper-16', 'Ultimate Flame-Grilled Chicken Whopper', 'Burgers & Fast Food', 'American', 'non-veg', 'Flame-grilled tender chicken patty with freshly sliced tomatoes, crunchy lettuce, creamy mayo, and pickles on a toasted 5-inch bun.', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('06598c31-337b-5247-b155-a2bf9f3fca27', '77a78ef1-fad9-5c5b-a1ae-a9e18eea28f2', 'burger-veg-cheesy-17', 'Double Decker Cheesy Veggie Tower Burger', 'Burgers & Fast Food', 'Continental', 'veg', 'Two crispy vegetable patties loaded with double English cheddar cheese slice, caramelized onions, and house special thousand island dressing.', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('ecd0dd7f-9412-5699-8559-30bedf7a4c20', 'cc372def-9658-5674-8f80-0ef4adc6c2b2', 'burger-chicken-peri-18', 'Peri-Peri Crispy Chicken Burger', 'Burgers & Fast Food', 'American', 'non-veg', 'Deep-fried chicken fillet sprinkled with African bird eye peri-peri spice dust, topped with iceberg lettuce and chipotle sauce.', 'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('6db708f2-038f-58b2-9429-6df720eecf42', 'c9cf0c2a-131e-5197-a6dd-5995a37a9592', 'momo-veg-steam-19', 'Steamed Veg Darjeeling Momos (8 Pcs)', 'Momos & Dumplings', 'Tibetan / Asian', 'veg', 'Authentic Darjeeling-style thin-wrapper momos stuffed with finely minced cabbage, carrots, spring onion, and ginger. Served with fiery red chili chutney.', 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('e910fc02-5264-5cbd-b1e0-2b8f8a9fa93b', '407bb834-aa78-5339-8c63-2d22b4864fa3', 'momo-chicken-steam-20', 'Authentic Steamed Chicken Dimsums (8 Pcs)', 'Momos & Dumplings', 'Tibetan / Asian', 'non-veg', 'Juicy minced chicken and scallion filling wrapped in translucent delicate dumpling dough, steamed fresh and paired with hot garlic sauce.', 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('6af25ff0-8f34-5b89-8a95-070e8a43405a', 'be5ec783-8109-5564-9c0e-80d728141b16', 'momo-paneer-fried-21', 'Crispy Fried Paneer Momos with Schezwan Dip (6 Pcs)', 'Momos & Dumplings', 'Tibetan / Indo-Chinese', 'veg', 'Golden fried crispy dumplings packed with spiced crumbled paneer and herbs, served with fiery Schezwan chili garlic sauce.', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('be93dc5f-4717-5d79-97cd-5d9b4b278338', '4c32ff82-c080-5e7a-8674-50ef97550222', 'momo-chicken-kurkure-22', 'Kurkure Crunchy Fried Chicken Momos (6 Pcs)', 'Momos & Dumplings', 'Street Fusion', 'non-veg', 'Dumplings battered with crispy crunchy flakes, deep fried until extra crunchy outside while juicy chicken remains tender inside.', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('c0592dd4-2075-5b1b-9a7b-3eaaa965a4b2', '78011f0d-d06f-5520-b582-3daff069c15c', 'momo-tandoori-chick-23', 'Smoky Tandoori Chicken Momos with Mint Chutney', 'Momos & Dumplings', 'Tandoori Fusion', 'non-veg', 'Chicken momos marinated in spiced tandoori curd masala, charred over live charcoal, tossed with chaat masala and butter.', 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('64df5a00-a7ca-5de2-a788-79905a7c2e5c', '1db6d01b-ae5f-5cf5-84c5-f3328fa37db5', 'momo-gravy-paneer-24', 'Afghani Creamy Malai Paneer Momos (6 Pcs)', 'Momos & Dumplings', 'Mughlai Fusion', 'veg', 'Steamed paneer momos drenched in a rich cashew-cream and cheese gravy with crushed black peppercorns and coriander.', 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('f9d0af4d-e8a9-59b7-8547-c3bac1c7ec90', '78986ffe-785e-5c4f-88e2-1d4bf4b3c5f8', 'chinese-noodles-veg-25', 'Veg Hakka Noodles with Chili Paneer Combo', 'Chinese food', 'Indo-Chinese', 'veg', 'Wok-tossed noodles with shredded cabbage, bell peppers, and scallions, served with saucy dry chili paneer cubes.', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('26466171-4bf5-5000-9691-57b3e261c62f', 'b94c1cb1-d9ff-5d2e-995c-c70dbcd879a3', 'chinese-chicken-manch-26', 'Chicken Manchurian with Egg Fried Rice Bowl', 'Chinese food', 'Indo-Chinese', 'non-veg', 'Golden chicken meatballs simmered in ginger, garlic, soy, and coriander gravy, served over hot egg fried rice.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('d51b65aa-12ab-59e7-a117-a92cc963b72c', '30ecac50-f4d4-5260-b4b0-7b279bdb7a7c', 'chinese-chili-paneer-27', 'Dry Chili Paneer with Bell Peppers & Spring Onions', 'Chinese food', 'Indo-Chinese', 'veg', 'Batter-coated cottage cheese wok-fried with garlic, green chilies, dark soy sauce, and spring onion greens.', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('67cbaeb3-aa16-5bf2-ab25-7b0eee4f0677', 'b55a0f0d-9a8f-5429-bf65-417860ac0f65', 'chinese-chicken-noodles-28', 'Schezwan Chicken Chili Garlic Noodles', 'Chinese food', 'Indo-Chinese', 'non-veg', 'Spicy noodles tossed with shredded chicken, pungent Schezwan peppercorn paste, crushed garlic, and bok choy.', 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('50827de9-e1f6-57df-a94e-27a8590a2c27', '44227cb4-7bb7-5e7c-afa2-84e51fed3629', 'chinese-spring-rolls-29', 'Crispy Golden Vegetable Spring Rolls (4 Pcs)', 'Chinese food', 'Asian / Chinese', 'veg', 'Crispy filo pastry rolls stuffed with julienned veggies and glass noodles, served with sweet chili dip.', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('4ebac0d5-f8cc-5f91-9c10-80cc923c2821', 'c3b99cc5-f873-5ccb-ba42-707847c4ae80', 'south-ghee-dosa-30', 'Classic Ghee Roast Masala Dosa', 'South Indian food', 'South Indian', 'veg', 'Golden crispy fermented crepe roasted with pure desi ghee, filled with spiced potato onion mash, served with trio chutneys and drumstick sambar.', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('98c7d10e-ec6e-5930-a8d4-68600c1e7f53', 'ef856dd5-cd43-5170-afc1-7b5e925d0c38', 'south-idli-vada-31', 'Steamed Button Idli & Crispy Medu Vada Combo', 'South Indian food', 'South Indian', 'veg', 'Two fluffy steamed rice cakes and one crunchy lentil doughnut, dunked in piping hot vegetable sambar with fresh coconut chutney.', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('15d49877-6ca4-53d1-8438-686b3e572600', 'a4d6dac0-b04c-5c77-be78-f5272197c3cf', 'south-mysore-masala-32', 'Crispy Mysore Masala Dosa with Red Garlic Chutney', 'South Indian food', 'South Indian', 'veg', 'Crisp crepe lined with spicy red chili garlic spread, stuffed with potato masala, and cooked with dollops of white butter.', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('28e02f17-d17d-5084-997c-ffbb250d4560', '55d8b630-8012-58be-96bc-007dfe142f82', 'south-rava-onion-33', 'Onion Rava Masala Dosa with Sambar', 'South Indian food', 'South Indian', 'veg', 'Lacy semolina crepe studded with chopped green chilies, ginger, and caramelized onions, filled with mashed potatoes.', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('0296e62a-b87b-5a43-85c4-e74643849d42', '1367d3b1-5089-516a-8bc9-137f624fb319', 'south-uttapam-onion-34', 'Tomato Onion Uttapam with Trio Chutneys', 'South Indian food', 'South Indian', 'veg', 'Thick savory pancake topped with juicy diced tomatoes, red onions, fresh coriander, and roasted cumin seeds.', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('3af75a9a-4748-58c1-91eb-1eaccd1a1e6c', '4eb1efc0-9b42-5b14-86fb-c5b1465d2f66', 'north-paneer-butter-35', 'Paneer Butter Masala Combo with 2 Butter Naan', 'North Indian food', 'North Indian', 'veg', 'Cottage cheese cubes in rich, creamy tomato and butter gravy, accompanied by 2 freshly baked butter garlic naans.', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('7b439900-c7ce-5c80-bc1c-7cab2bed6b9d', 'a3997796-97fc-5023-827c-48882be14298', 'north-dal-makhani-36', 'Slow-Cooked Dal Makhani with Garlic Naan', 'North Indian food', 'North Indian / Punjabi', 'veg', 'Black lentils slow cooked overnight on charcoal embers with churned butter and cream, served with crisp garlic naan.', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('f9f01f9c-7caf-571e-ab99-26c7002d86eb', '2ccbe748-5d29-5f18-ba00-c0b8357f4e1e', 'north-butter-chicken-37', 'Old Delhi Style Murgh Butter Chicken', 'North Indian food', 'North Indian / Mughlai', 'non-veg', 'Tandoor-roasted chicken pieces cooked in a silky, velvety tomato gravy laced with butter, fenugreek, and cream.', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('025b127e-e3ae-5de4-855c-f22ee4909c5a', 'b494fcf9-7a79-5322-a2cb-823fc32a2700', 'north-shahi-paneer-38', 'Shahi Paneer with Desi Ghee Phulkas (3 Pcs)', 'North Indian food', 'North Indian / Mughlai', 'veg', 'Soft cottage cheese simmered in aromatic cashew, cardamom, and saffron gravy, served with piping hot wheat rotis.', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('30a8de49-4947-53ab-8aae-78701750576f', '06863cb6-4b52-557a-881b-a1d87df145dc', 'north-thali-veg-deluxe-39', 'Executive North Indian Veg Thali', 'North Indian food', 'North Indian', 'veg', 'Complete meal box: Paneer dish, Dal Makhani, seasonal dry vegetable, Jeera Rice, 2 Butter Naan, Gulab Jamun, and salad.', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('249caa47-a7cb-57ec-9d7d-87459d387fa5', '25989bcf-86b1-5280-99bf-1f0bd7186b6e', 'north-chole-bhature-40', 'Amritsari Pindi Chole Bhature (2 Pcs)', 'North Indian food', 'Punjabi', 'veg', 'Dark spicy chickpea curry cooked with pomegranate seeds and dry spices, served with fluffy hot bhature, pickled carrots, and onions.', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('5fba4807-5e09-5c7e-847a-97c99546e66d', '6b0fb9fe-f2b5-5dbe-a226-eb59cf257132', 'bev-cold-coffee-thirdwave-41', 'Signature Cold Coffee & Fudgy Brownie', 'Beverages', 'Cafe', 'veg', 'Double shot slow-brewed espresso blended with chilled whole milk, paired with a warm Belgian dark chocolate walnut brownie.', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('38bffa84-e6ee-5ec2-a99b-fd38a086ccd1', 'd55905ac-243b-52b0-9c12-ba79837cd97a', 'bev-classic-cold-coffee-42', 'Classic Creamy Chilled Cold Coffee (300ml)', 'Beverages', 'Cafe', 'veg', 'Classic creamy iced coffee churned with ice cream, cocoa dust, and rich milk. Sweet, refreshing, and budget friendly.', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('71f7d1c5-cf09-5169-b0a7-59bacc6cd4d1', '318047e5-85a0-5df7-9d63-8c9449005b58', 'bev-iced-caramel-latte-43', 'Iced Caramel Macchiato Latte', 'Beverages', 'Cafe', 'veg', 'Freshly steamed milk with vanilla-flavored syrup, marked with espresso and topped with a caramel drizzle over ice.', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('b22c5eea-22cc-5964-92e7-fd8f6f44bb35', '4fac629a-2f45-58bc-8b5f-a5a156fa5029', 'bev-mango-lassi-44', 'Malai Kesar Mango Lassi (400ml)', 'Beverages', 'North Indian', 'veg', 'Thick churned sweet yogurt blended with Alphonso mango pulp and saffron strands, crowned with malai and pistachio slivers.', 'https://images.unsplash.com/photo-1571006687082-8c105e46bfb0?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('11770ee9-e0b4-5559-a2f4-98325c54e9dc', '847a42c3-063a-544b-933d-f45774fb5157', 'bev-chocolate-thickshake-45', 'Belgian Dark Chocolate Thickshake', 'Beverages', 'Dessert Drinks', 'veg', 'Decadent dark chocolate gelato blended thick with milk and chocolate shavings. Thick enough to eat with a spoon.', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('3d103860-ed46-5bf4-98fb-69009a390e36', 'd1cbc33f-e24d-55a1-a254-feb968621759', 'bev-masala-chai-flask-46', 'Desi Kulhad Ginger Masala Chai (500ml Flask)', 'Beverages', 'Indian Hot Drinks', 'veg', 'Hot brewed tea leaves with fresh crushed ginger, green cardamom, cloves, and whole milk, packed in an insulated heat-retaining flask.', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('a0091448-15c6-5eb4-9ba6-4713cc91447b', 'fdd534ca-37d2-5ff6-8da2-9e44c9f1884c', 'dessert-gulab-jamun-47', 'Hot Desi Ghee Gulab Jamun (4 Pcs)', 'Desserts', 'Indian Sweets', 'veg', 'Soft melt-in-mouth cottage cheese and mawa dumplings fried in pure desi ghee, soaked in warm rose and cardamom sugar syrup.', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('64923d5d-ce8c-53f4-90c1-1d68219325e0', '63f4c426-528b-585f-a55e-5ce688d9c2e2', 'dessert-brownie-fudge-48', 'Warm Belgian Chocolate Walnut Brownie', 'Desserts', 'Bakery / Desserts', 'veg', 'Dense, gooey Belgian chocolate fudge brownie loaded with roasted California walnuts and molten dark chocolate chunks.', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('f4eb08a6-2cac-5640-9330-6df4782e2ee5', '3dec8fe4-57a5-52c3-b215-5a18ff820629', 'dessert-rasmalai-49', 'Kesar Pista Chilled Rasmalai (2 Pcs)', 'Desserts', 'Bengali Sweets', 'veg', 'Spongy chenna patties flattened and steeped in reduced saffron milk garnished with crushed pistachios and almonds.', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('9a4601c7-1f44-58a3-a773-187761a28d8f', '9eb775b4-a5e1-5ac5-bcf9-40fc0b33a3b4', 'dessert-icecream-sundae-50', 'Death By Chocolate Supreme Ice Cream Sundae', 'Desserts', 'Desserts / Ice Cream', 'veg', 'Layers of chocolate sponge cake, two scoops of vanilla and chocolate gelato, roasted nuts, honey and warm fudge topping.', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('f6eee91d-faff-587e-8a47-00f6e0a65d6d', '87b4c082-3526-587e-99c9-aa07ac7874c7', 'dessert-churros-nutella-51', 'Crispy Cinnamon Sugar Churros with Nutella Dip', 'Desserts', 'Spanish / Desserts', 'veg', 'Spanish fried dough pastries piped with fluted edges, dusted with cinnamon sugar, served with a pot of warm hazelnut Nutella.', 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('1229e8a5-898a-528a-acfa-137170163b43', '9965d02c-587c-5742-91b0-7d07f20ade28', 'snack-samosa-chole-52', 'Crispy Punjabi Aloo Samosa with Chole Chaat (2 Pcs)', 'Snacks', 'North Indian Street Food', 'veg', 'Two golden fried triangle samosas crushed and smothered with spicy pindi chole, sweetened curd, tamarind chutney, and sev.', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('2c4313c2-03de-519e-9327-83f5f32bfb1e', 'add174df-9fe1-541b-ab5e-a4e09db4ba60', 'snack-pani-puri-53', 'Delhi Style Suji Golgappe / Pani Puri (8 Pcs)', 'Snacks', 'Indian Street Food', 'veg', 'Crisp semolina hollow puris filled with spiced boiled potato-chickpea mash, dunked in tangy mint-coriander and sweet saunth water.', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('b66195e9-9d6d-53a7-b1c6-7e9cad37dec8', '3c5783a7-ea70-569d-985f-a996ef60d9f4', 'snack-chicken-roll-54', 'Kolkata Crispy Chicken Kathi Roll', 'Snacks', 'Kolkata Street Food', 'non-veg', 'Paratha layered with pan-fried egg, wrapped around juicy spiced chicken tikka strips, sliced onions, green chilies, and lemon juice.', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('98228587-e065-5c54-8c55-3448ec8e2d47', 'fcd523d5-1b0c-5bb1-966c-4c353428de4b', 'snack-paneer-tikka-55', 'Tandoori Char-Grilled Paneer Tikka (6 Pcs)', 'Snacks', 'Tandoori / North Indian', 'veg', 'Cubes of fresh paneer marinated in spiced yogurt with bell peppers and onions, roasted on skewers in a clay tandoor.', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

INSERT INTO public.food_items (id, restaurant_id, slug, name, category, cuisine, dietary, description, image_url, is_available, is_demo_data)
VALUES ('abf72175-f60b-5b23-bcbc-0ad9a144748b', 'ad648697-34c0-5032-a573-500602bc77db', 'snack-french-fries-56', 'Peri Peri Seasoned Crinkle Cut Fries', 'Snacks', 'American Fast Food', 'veg', 'Golden crinkle-cut potato fries tossed in tangy and spicy African peri peri seasoning mix. Served with garlic dip.', 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&auto=format&fit=crop&q=60', true, true)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url;

