const asyncFetch = async () => {
    try {
        const res = await fetch("http://localhost:3000/api/admin/orders");
        if (!res.ok) {
            console.log("Failed:", res.status, await res.text());
            return;
        }
        const data = await res.json();
        const order = data.find((o: any) => o.orderNumber === "RWY-IXAVOMBGE");
        console.log("Order Found:", !!order);
        if (order) {
            console.log("Story Data Keys:", Object.keys(order.storyData || {}));
            console.log("Has Blueprint:", !!order.storyData?.blueprint);
            if (order.storyData?.blueprint) {
                console.log("Blueprint Themes/Titles:", order.storyData.blueprint.foundation?.title, order.storyData.blueprint.foundation?.targetAge);
            }
        }
    } catch (e) {
        console.error("FETCH FAILED:", e);
    }
};
asyncFetch();
