-- ====================================================================
-- Munim AI - Demo Shop Seed Data
-- 8 Customers, 12 Items, 2 Suppliers, 14 Days of Transactions
-- ====================================================================

-- Demo Shop ID & User ID
DO $$
DECLARE
    v_shop_id UUID := '00000000-0000-0000-0000-000000000001';
    v_user_id UUID := '00000000-0000-0000-0000-000000000002';
    
    -- Customer UUIDs
    c_ramesh_sharma UUID := '11111111-0000-0000-0000-000000000001';
    c_ramesh_kumar UUID  := '11111111-0000-0000-0000-000000000002';
    c_gurpreet UUID      := '11111111-0000-0000-0000-000000000003';
    c_sunita UUID        := '11111111-0000-0000-0000-000000000004';
    c_harpreet UUID      := '11111111-0000-0000-0000-000000000005';
    c_amit UUID          := '11111111-0000-0000-0000-000000000006';
    c_rajesh UUID        := '11111111-0000-0000-0000-000000000007';
    c_manoj UUID         := '11111111-0000-0000-0000-000000000008';

    -- Item UUIDs
    i_chini UUID   := '22222222-0000-0000-0000-000000000001';
    i_aata UUID    := '22222222-0000-0000-0000-000000000002';
    i_doodh UUID   := '22222222-0000-0000-0000-000000000003';
    i_chawal UUID  := '22222222-0000-0000-0000-000000000004';
    i_dal UUID     := '22222222-0000-0000-0000-000000000005';
    i_tel UUID     := '22222222-0000-0000-0000-000000000006';
    i_chai UUID    := '22222222-0000-0000-0000-000000000007';
    i_namak UUID   := '22222222-0000-0000-0000-000000000008';
    i_sabun UUID   := '22222222-0000-0000-0000-000000000009';
    i_biscuit UUID := '22222222-0000-0000-0000-000000000010';
    i_haldi UUID   := '22222222-0000-0000-0000-000000000011';
    i_maggi UUID   := '22222222-0000-0000-0000-000000000012';

    -- Supplier UUIDs
    s_aggarwal UUID := '33333333-0000-0000-0000-000000000001';
    s_gupta UUID    := '33333333-0000-0000-0000-000000000002';

    v_day INT;
BEGIN
    -- 1. Create Demo Shop
    INSERT INTO public.shops (id, name, owner_phone, upi_id, pin_hash, settings)
    VALUES (
        v_shop_id,
        'Sharma Kirana & General Store',
        '+919876543210',
        'sharmakirana@okaxis',
        '1234', -- Demo 4-digit PIN
        '{"language": "hi", "credit_warning_limit": 1000, "voice_confirm": true}'::jsonb
    ) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- 2. Create Demo User
    INSERT INTO public.users (id, shop_id, phone, name, role)
    VALUES (
        v_user_id,
        v_shop_id,
        '+919876543210',
        'Madan Lal Sharma',
        'owner'
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. Create 8 Customers (Including Two Rameshes)
    INSERT INTO public.customers (id, shop_id, name, phone, preferred_language, address_note, credit_limit, balance_owed, trust_score)
    VALUES
        (c_ramesh_sharma, v_shop_id, 'Ramesh Sharma', '+919811100001', 'hi', 'Gali 4, Sharma Niwas', 5000.00, 500.00, 92),
        (c_ramesh_kumar,  v_shop_id, 'Ramesh Kumar',  '+919811100002', 'hi', 'Near Temple (Mandir ke paas)', 4000.00, 1450.00, 78),
        (c_gurpreet,      v_shop_id, 'Gurpreet Singh', '+919811100003', 'pa', 'GT Road, Petrol pump back', 6000.00, 2200.00, 85),
        (c_sunita,        v_shop_id, 'Sunita Devi',    '+919811100004', 'hi', 'House 14, Purani Basti', 3000.00, 350.00, 96),
        (c_harpreet,      v_shop_id, 'Harpreet Kaur',  '+919811100005', 'pa', 'Near Gurudwara, Model Town', 5000.00, 1800.00, 74),
        (c_amit,          v_shop_id, 'Amit Verma',     '+919811100006', 'hi', 'Railway Road, Flat 2B', 4000.00, 850.00, 88),
        (c_rajesh,        v_shop_id, 'Rajesh Gupta',   '+919811100007', 'hi', 'Main Market, Gupta Sweets', 10000.00, 0.00, 99),
        (c_manoj,         v_shop_id, 'Manoj Tiwari',   '+919811100008', 'hi', 'Near Bus Stand, Auto union', 3000.00, 1200.00, 68)
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, 
        address_note = EXCLUDED.address_note,
        balance_owed = EXCLUDED.balance_owed;

    -- 4. Create 12 Items
    INSERT INTO public.items (id, shop_id, name, synonyms, unit, cost_price, selling_price, current_stock, min_threshold)
    VALUES
        (i_chini,   v_shop_id, 'chini', ARRAY['cheeni', 'sugar', 'sakkar', 'mishri'], 'kilo', 38.00, 44.00, 45.0, 15.0),
        (i_aata,    v_shop_id, 'aata', ARRAY['atta', 'flour', 'gehu aata', 'ashirvaad aata', 'chakki aata'], 'kilo', 32.00, 38.00, 60.0, 20.0),
        (i_doodh,   v_shop_id, 'doodh', ARRAY['milk', 'amul doodh', 'amul taaza', 'dahi'], 'litre', 58.00, 66.00, 8.0, 15.0),
        (i_chawal,  v_shop_id, 'chawal', ARRAY['rice', 'kolam', 'basmati', 'tota pari'], 'kilo', 45.00, 55.00, 80.0, 25.0),
        (i_dal,     v_shop_id, 'dal', ARRAY['daal', 'toor dal', 'arhar dal', 'moong dal', 'chana dal'], 'kilo', 110.00, 130.00, 35.0, 10.0),
        (i_tel,     v_shop_id, 'tel', ARRAY['oil', 'mustard oil', 'sarso tel', 'fortune oil', 'refine'], 'litre', 135.00, 155.00, 22.0, 10.0),
        (i_chai,    v_shop_id, 'chai patti', ARRAY['tea', 'chai', 'chai patti', 'taj mahal', 'tata tea', 'red label'], 'packet', 115.00, 135.00, 18.0, 8.0),
        (i_namak,   v_shop_id, 'namak', ARRAY['salt', 'tata salt', 'sendha namak', 'kala namak'], 'packet', 22.00, 28.00, 50.0, 15.0),
        (i_sabun,   v_shop_id, 'sabun', ARRAY['soap', 'lifebuoy', 'dettol', 'lux', 'rin', 'surf', 'surf excel'], 'piece', 28.00, 35.00, 40.0, 15.0),
        (i_biscuit, v_shop_id, 'biscuit', ARRAY['biscuits', 'parle-g', 'parleg', 'good day', 'monaco', 'marie'], 'packet', 18.00, 25.00, 55.0, 20.0),
        (i_haldi,   v_shop_id, 'haldi', ARRAY['turmeric', 'haldi powder', 'masala', 'everest haldi', 'catch haldi'], 'packet', 30.00, 40.00, 30.0, 10.0),
        (i_maggi,   v_shop_id, 'maggi', ARRAY['maggie', 'noodles', 'maggi noodles', 'chhoti maggi'], 'packet', 12.00, 14.00, 65.0, 25.0)
    ON CONFLICT (id) DO UPDATE SET 
        synonyms = EXCLUDED.synonyms,
        selling_price = EXCLUDED.selling_price,
        current_stock = EXCLUDED.current_stock;

    -- 5. Create 2 Suppliers
    INSERT INTO public.suppliers (id, shop_id, name, phone, category)
    VALUES
        (s_aggarwal, v_shop_id, 'Aggarwal Grain Wholesale Mandi', '+919822200001', 'Grains, Pulses & Sugar'),
        (s_gupta,    v_shop_id, 'Gupta Dairy & FMCG Agency',     '+919822200002', 'Dairy, Oil, Packaged Snacks & Spices')
    ON CONFLICT (id) DO NOTHING;

    -- 6. Insert 14 Days of Realistic Past Sales & Transactions
    -- Generating consistent sales for doodh (~10-15 L/day), chini (~8-12 kg/day), aata (~12-20 kg/day)
    FOR v_day IN REVERSE 14..1 LOOP
        -- Cash Sale 1 (Morning)
        INSERT INTO public.transactions (shop_id, type, amount, items, created_at, confirmed_by_voice, voice_transcript)
        VALUES (
            v_shop_id,
            'sale',
            330.00,
            jsonb_build_array(
                jsonb_build_object('item_id', i_doodh, 'name', 'doodh', 'quantity', 2, 'unit', 'litre', 'price', 132.00),
                jsonb_build_object('item_id', i_chini, 'name', 'chini', 'quantity', 3, 'unit', 'kilo', 'price', 132.00),
                jsonb_build_object('item_id', i_maggi, 'name', 'maggi', 'quantity', 4, 'unit', 'packet', 'price', 56.00)
            ),
            now() - (v_day || ' days')::INTERVAL + '8 hours'::INTERVAL,
            true,
            'Subah ka sauda: 2 litre doodh, 3 kilo chini aur 4 maggi'
        );

        -- Cash Sale 2 (Afternoon)
        INSERT INTO public.transactions (shop_id, type, amount, items, created_at, confirmed_by_voice, voice_transcript)
        VALUES (
            v_shop_id,
            'sale',
            560.00,
            jsonb_build_array(
                jsonb_build_object('item_id', i_aata, 'name', 'aata', 'quantity', 10, 'unit', 'kilo', 'price', 380.00),
                jsonb_build_object('item_id', i_tel, 'name', 'tel', 'quantity', 1, 'unit', 'litre', 'price', 155.00),
                jsonb_build_object('item_id', i_namak, 'name', 'namak', 'quantity', 1, 'unit', 'packet', 'price', 28.00)
            ),
            now() - (v_day || ' days')::INTERVAL + '14 hours'::INTERVAL,
            true,
            '10 kilo aata, 1 litre tel aur 1 packet namak becha'
        );

        -- Evening Sale or Udhaar
        IF v_day % 3 = 0 THEN
            INSERT INTO public.transactions (shop_id, type, amount, items, customer_id, created_at, confirmed_by_voice, voice_transcript)
            VALUES (
                v_shop_id,
                'credit',
                450.00,
                jsonb_build_array(
                    jsonb_build_object('item_id', i_dal, 'name', 'dal', 'quantity', 2, 'unit', 'kilo', 'price', 260.00),
                    jsonb_build_object('item_id', i_chai, 'name', 'chai patti', 'quantity', 1, 'unit', 'packet', 'price', 135.00)
                ),
                c_ramesh_kumar,
                now() - (v_day || ' days')::INTERVAL + '19 hours'::INTERVAL,
                true,
                'Ramesh Kumar ko 450 ka udhaar, dal aur chai'
            );
        END IF;

        IF v_day % 5 = 0 THEN
            INSERT INTO public.transactions (shop_id, type, amount, customer_id, created_at, confirmed_by_voice, voice_transcript)
            VALUES (
                v_shop_id,
                'payment',
                500.00,
                c_ramesh_kumar,
                now() - (v_day || ' days')::INTERVAL + '20 hours'::INTERVAL,
                true,
                'Ramesh Kumar ne 500 diye'
            );
        END IF;
    END LOOP;

    -- Add a recent Udhaar transaction with proof audio path for Ramesh Sharma
    INSERT INTO public.transactions (shop_id, type, amount, items, customer_id, created_at, confirmed_by_voice, proof_clip_path, voice_transcript)
    VALUES (
        v_shop_id,
        'credit',
        500.00,
        jsonb_build_array(
            jsonb_build_object('item_id', i_aata, 'name', 'aata', 'quantity', 5, 'unit', 'kilo', 'price', 190.00),
            jsonb_build_object('item_id', i_chini, 'name', 'chini', 'quantity', 5, 'unit', 'kilo', 'price', 220.00),
            jsonb_build_object('item_id', i_maggi, 'name', 'maggi', 'quantity', 6, 'unit', 'packet', 'price', 84.00)
        ),
        c_ramesh_sharma,
        now() - '2 hours'::INTERVAL,
        true,
        '00000000-0000-0000-0000-000000000001/proof_ramesh_sharma_500.webm',
        'Ramesh Sharma ko 500 ka udhaar, aata aur chini'
    );

    -- Sample reminder
    INSERT INTO public.reminders (shop_id, customer_id, amount, message_text, language, upi_link, status, sent_at)
    VALUES (
        v_shop_id,
        c_gurpreet,
        2200.00,
        'Sat Sri Akal Gurpreet ji, Sharma Kirana da 2200 rupaye baaki hai. Kripya is link te payment kar deo: upi://pay?pa=sharmakirana@okaxis&am=2200',
        'pa',
        'upi://pay?pa=sharmakirana@okaxis&am=2200&pn=SharmaKirana',
        'sent',
        now() - '1 day'::INTERVAL
    );

END $$;
