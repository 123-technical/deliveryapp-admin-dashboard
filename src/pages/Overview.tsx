import { Card, Col, Row, Statistic } from "antd";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { name: "Mon", orders: 120, revenue: 3200 },
  { name: "Tue", orders: 98, revenue: 2800 },
  { name: "Wed", orders: 150, revenue: 4100 },
  { name: "Thu", orders: 130, revenue: 3600 },
  { name: "Fri", orders: 170, revenue: 4800 },
  { name: "Sat", orders: 220, revenue: 6200 },
  { name: "Sun", orders: 190, revenue: 5400 },
];

export default function Overview() {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic title="Today's Orders" value={168} />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic title="Active Riders" value={54} />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic title="Avg. Delivery Time (min)" value={28} />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic title="Revenue (today)" prefix="$" value={13820} />
        </Card>
      </Col>

      <Col span={24}>
        <Card title="Weekly Orders">
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <AreaChart
                data={data}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1677ff" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#1677ff"
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>
    </Row>
  );
}
