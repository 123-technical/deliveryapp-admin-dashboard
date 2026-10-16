import { useCallback, useEffect, useState } from "react";
import {
  App,
  AutoComplete,
  Button,
  ColorPicker,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Slider,
  Switch,
  Table,
  Tabs,
} from "antd";
import type { Color } from "antd/es/color-picker";
import { DeleteOutlined, EditOutlined, ExportOutlined, PictureOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import DrawerForm from "../components/DrawerForm";
import AdImageField from "../components/ads/AdImageField";
import { validateAdImage, type AdImageValue } from "../components/ads/adImage";
import AdPreview from "../components/ads/AdPreview";
import { AdApiError, adService } from "../services/ads";
import { uploadService } from "../services/upload";
import {
  AD_LIMITS,
  PLACEMENT_SPECS,
  type Ad,
  type AdPlacement,
  type AdSettings,
  type AdStatus,
  type CreateAdDto,
} from "../types/ad";

const PLACEMENT_OPTIONS = (Object.keys(PLACEMENT_SPECS) as AdPlacement[]).map((p) => ({
  value: p,
  label: PLACEMENT_SPECS[p].label,
}));

const STATUS_META: Record<AdStatus, { label: string; badge: string }> = {
  ACTIVE: { label: "Active", badge: "active" },
  SCHEDULED: { label: "Scheduled", badge: "confirmed" },
  EXPIRED: { label: "Expired", badge: "inactive" },
  PAUSED: { label: "Paused", badge: "pending" },
};

const CTA_PRESETS = ["Shop Now", "Visit Now", "Learn More", "Order Now"].map((v) => ({ value: v }));

const FORM_FIELDS = [
  "placement",
  "advertiserName",
  "title",
  "subtitle",
  "image",
  "ctaText",
  "targetUrl",
  "backgroundColor",
  "ctaColor",
  "displaySeconds",
  "priority",
  "isActive",
  "schedule",
] as const;

type AdFormValues = {
  placement: AdPlacement;
  advertiserName: string;
  title: string;
  subtitle?: string;
  image?: AdImageValue;
  ctaText: string;
  targetUrl: string;
  backgroundColor?: string | null;
  ctaColor?: string | null;
  displaySeconds?: number;
  priority?: number;
  isActive: boolean;
  schedule?: [Dayjs | null, Dayjs | null];
};

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const formatDate = (iso: string) => dayjs(iso).format("D MMM YYYY, HH:mm");

/** Backend validation messages start with the field name ("title must be…"). */
function fieldForError(msg: string): (typeof FORM_FIELDS)[number] | null {
  const first = msg.split(" ")[0];
  if (first === "imageUrl") return "image";
  if (first === "startAt" || first === "endAt") return "schedule";
  return (FORM_FIELDS as readonly string[]).includes(first) ? (first as (typeof FORM_FIELDS)[number]) : null;
}

/** Creative thumbnail at the placement's own ratio. */
function AdThumb({ ad }: { ad: Ad }) {
  const [failed, setFailed] = useState(false);
  const spec = PLACEMENT_SPECS[ad.placement];
  return (
    <div
      style={{
        height: 40,
        aspectRatio: `${spec.width} / ${spec.height}`,
        borderRadius: 6,
        overflow: "hidden",
        background: "#F1F5F9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94A3B8",
      }}
    >
      {failed ? (
        <PictureOutlined />
      ) : (
        <img src={ad.imageUrl} alt={ad.title} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Ads tab
// ─────────────────────────────────────────────

function AdsTab() {
  const { message } = App.useApp();
  const [ads, setAds] = useState<Ad[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [placement, setPlacement] = useState<AdPlacement | undefined>();
  const [status, setStatus] = useState<AdStatus | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form] = Form.useForm<AdFormValues>();
  const watched = Form.useWatch([], form) as Partial<AdFormValues> | undefined;
  const formPlacement: AdPlacement = watched?.placement ?? "HOME_BANNER";

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adService.getAds({ page, pageSize, search: search || undefined, placement, status });
      setAds(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to fetch ads");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, placement, status, message]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // Re-check the image whenever the placement (and so the required ratio) changes.
  useEffect(() => {
    if (drawerOpen && form.getFieldValue("image")) form.validateFields(["image"]).catch(() => undefined);
  }, [formPlacement, drawerOpen, form]);

  const openCreate = () => {
    setEditingAd(null);
    form.resetFields();
    form.setFieldsValue({
      placement: placement ?? "HOME_BANNER",
      ctaText: "Shop Now",
      isActive: true,
      priority: 0,
      displaySeconds: 6,
    });
    setDrawerOpen(true);
  };

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    form.resetFields();
    form.setFieldsValue({
      placement: ad.placement,
      advertiserName: ad.advertiserName,
      title: ad.title,
      subtitle: ad.subtitle ?? undefined,
      image: ad.imageUrl,
      ctaText: ad.ctaText,
      targetUrl: ad.targetUrl,
      backgroundColor: ad.backgroundColor,
      ctaColor: ad.ctaColor,
      displaySeconds: ad.displaySeconds ?? 6,
      priority: ad.priority,
      isActive: ad.isActive,
      schedule: ad.startAt || ad.endAt ? [ad.startAt ? dayjs(ad.startAt) : null, ad.endAt ? dayjs(ad.endAt) : null] : undefined,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingAd(null);
    form.resetFields();
  };

  const handleSave = async () => {
    let values: AdFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // field errors are already shown
    }

    setSaving(true);
    try {
      let imageKey: string;
      if (values.image instanceof File) {
        imageKey = await uploadService.uploadFile(values.image);
      } else if (editingAd && values.image === editingAd.imageUrl) {
        imageKey = editingAd.imageKey;
      } else {
        imageKey = values.image as string;
      }

      const [start, end] = values.schedule ?? [null, null];
      const dto: CreateAdDto = {
        placement: values.placement,
        advertiserName: values.advertiserName.trim(),
        title: values.title.trim(),
        subtitle: values.subtitle?.trim() || null,
        imageUrl: imageKey,
        ctaText: values.ctaText.trim(),
        targetUrl: values.targetUrl.trim(),
        backgroundColor: values.backgroundColor || null,
        ctaColor: values.ctaColor || null,
        displaySeconds: values.placement === "ORDER_SUCCESS" ? values.displaySeconds ?? 6 : null,
        priority: values.priority ?? 0,
        isActive: values.isActive,
        startAt: start ? start.toISOString() : null,
        endAt: end ? end.toISOString() : null,
      };

      if (editingAd) {
        await adService.updateAd(editingAd.id, dto);
        message.success("Ad updated");
      } else {
        await adService.createAd(dto);
        message.success("Ad created");
      }
      closeDrawer();
      fetchAds();
    } catch (e) {
      if (e instanceof AdApiError && e.fieldErrors.length) {
        const byField = new Map<string, string[]>();
        const unmatched: string[] = [];
        for (const msg of e.fieldErrors) {
          const field = fieldForError(msg);
          if (field) byField.set(field, [...(byField.get(field) ?? []), msg]);
          else unmatched.push(msg);
        }
        form.setFields([...byField].map(([name, errors]) => ({ name: name as keyof AdFormValues, errors })));
        message.error(unmatched[0] ?? "Please fix the highlighted fields");
      } else {
        message.error(e instanceof Error ? e.message : "Failed to save ad");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ad: Ad) => {
    setTogglingId(ad.id);
    try {
      const updated = await adService.toggleAd(ad.id);
      setAds((prev) => prev.map((a) => (a.id === ad.id ? updated : a)));
      message.success(updated.isActive ? "Ad activated" : "Ad paused");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to update ad");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (ad: Ad) => {
    try {
      await adService.deleteAd(ad.id);
      message.success("Ad deleted");
      if (ads.length === 1 && page > 1) setPage(page - 1);
      else fetchAds();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to delete ad");
    }
  };

  const columns = [
    {
      title: "Creative",
      key: "image",
      width: 96,
      render: (_: unknown, ad: Ad) => <AdThumb ad={ad} />,
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (title: string, ad: Ad) => (
        <button
          onClick={() => openEdit(ad)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#0F172A", fontWeight: 500, fontSize: 13, textAlign: "left" }}
        >
          {title}
        </button>
      ),
    },
    {
      title: "Advertiser",
      dataIndex: "advertiserName",
      key: "advertiserName",
      render: (v: string) => <span style={{ fontSize: 13, color: "#475569" }}>{v}</span>,
    },
    {
      title: "Placement",
      dataIndex: "placement",
      key: "placement",
      width: 130,
      render: (p: AdPlacement) => <span className="ds-badge sub">{PLACEMENT_SPECS[p].label}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 105,
      render: (s: AdStatus) => <span className={`ds-badge ${STATUS_META[s].badge}`}>{STATUS_META[s].label}</span>,
    },
    {
      title: "Schedule",
      key: "schedule",
      width: 200,
      render: (_: unknown, ad: Ad) => (
        <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, display: "block" }}>
          {!ad.startAt && !ad.endAt && "Always on"}
          {ad.startAt && <div>From {formatDate(ad.startAt)}</div>}
          {ad.endAt && <div>Until {formatDate(ad.endAt)}</div>}
        </span>
      ),
    },
    { title: "Priority", dataIndex: "priority", key: "priority", width: 95, align: "right" as const },
    {
      title: "Impr.",
      dataIndex: "impressions",
      key: "impressions",
      width: 85,
      align: "right" as const,
      render: (n: number) => n.toLocaleString(),
    },
    {
      title: "Clicks",
      dataIndex: "clicks",
      key: "clicks",
      width: 80,
      align: "right" as const,
      render: (n: number) => n.toLocaleString(),
    },
    {
      title: "CTR",
      dataIndex: "ctr",
      key: "ctr",
      width: 80,
      align: "right" as const,
      render: (n: number) => `${n.toFixed(2)}%`,
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      fixed: "right" as const,
      render: (_: unknown, ad: Ad) => (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          <Switch
            size="small"
            checked={ad.isActive}
            loading={togglingId === ad.id}
            onChange={() => handleToggle(ad)}
            title={ad.isActive ? "Pause" : "Activate"}
          />
          <Button className="ds-action-btn edit" icon={<EditOutlined style={{ fontSize: 14 }} />} onClick={() => openEdit(ad)} title="Edit" />
          <Popconfirm
            title="Delete ad"
            description="It stops showing in the app immediately."
            onConfirm={() => handleDelete(ad)}
            okText="Delete"
            cancelText="Cancel"
            okType="danger"
          >
            <Button className="ds-action-btn delete" icon={<DeleteOutlined style={{ fontSize: 14 }} />} title="Delete" />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const spec = PLACEMENT_SPECS[formPlacement];
  const targetUrl: string = watched?.targetUrl ?? "";

  return (
    <>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
          placeholder="Search title or advertiser"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          placeholder="All placements"
          style={{ width: 170 }}
          value={placement}
          onChange={(v) => {
            setPlacement(v);
            setPage(1);
          }}
          options={PLACEMENT_OPTIONS}
        />
        <Select
          allowClear
          placeholder="All statuses"
          style={{ width: 150 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={(Object.keys(STATUS_META) as AdStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label }))}
        />
        <Button icon={<PlusOutlined />} className="ds-btn-primary" style={{ marginLeft: "auto" }} onClick={openCreate}>
          New Ad
        </Button>
      </div>

      <div className="ds-table-wrapper">
        <Table
          columns={columns}
          dataSource={ads}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} ads`,
            onChange: (p, ps) => {
              setPage(ps !== pageSize ? 1 : p);
              setPageSize(ps);
            },
          }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">📣</div>
                <div className="ds-empty-text">
                  {search || placement || status ? "No ads match these filters" : "No ads yet — create the first one"}
                </div>
              </div>
            ),
          }}
        />
      </div>

      <DrawerForm
        isOpen={drawerOpen}
        title={editingAd ? "Edit Ad" : "New Ad"}
        onClose={closeDrawer}
        onSubmit={handleSave}
        isSubmitting={saving}
        submitLabel={editingAd ? "Save Changes" : "Create Ad"}
        width="min(1040px, 100vw)"
      >
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          <Form form={form} layout="vertical" name="adForm" style={{ flex: 1, minWidth: 0 }} requiredMark="optional">
            <Form.Item
              name="placement"
              label="Placement"
              rules={[{ required: true }]}
              extra={`Creative: ${spec.width}×${spec.height} px (${spec.ratioLabel})`}
            >
              <Select options={PLACEMENT_OPTIONS} />
            </Form.Item>

            <Form.Item
              name="image"
              label="Image"
              rules={[
                { required: true, message: "Please add an image" },
                { validator: (_, v) => (v ? validateAdImage(v, form.getFieldValue("placement") ?? "HOME_BANNER") : Promise.resolve()) },
              ]}
            >
              <AdImageField placement={formPlacement} />
            </Form.Item>

            <Form.Item name="advertiserName" label="Advertiser name" rules={[{ required: true, whitespace: true, message: "Advertiser name is required" }]}>
              <Input maxLength={AD_LIMITS.advertiserName} showCount placeholder="e.g. FreshFarm Organics" />
            </Form.Item>

            <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true, message: "Title is required" }]}>
              <Input maxLength={AD_LIMITS.title} showCount placeholder="Headline shown on the ad" />
            </Form.Item>

            <Form.Item name="subtitle" label="Subtitle">
              <Input maxLength={AD_LIMITS.subtitle} showCount placeholder='e.g. "Up to 50% off"' />
            </Form.Item>

            <div style={{ display: "flex", gap: 16 }}>
              <Form.Item
                name="ctaText"
                label="Button text"
                style={{ flex: 1 }}
                rules={[
                  { required: true, whitespace: true, message: "Button text is required" },
                  { max: AD_LIMITS.ctaText, message: `Max ${AD_LIMITS.ctaText} characters` },
                ]}
                extra={`${(watched?.ctaText ?? "").length} / ${AD_LIMITS.ctaText} · presets or your own`}
              >
                <AutoComplete options={CTA_PRESETS} filterOption={false} placeholder="Pick or type" />
              </Form.Item>
              <Form.Item name="priority" label="Priority" style={{ width: 120 }} tooltip="Higher shows first">
                <InputNumber min={0} max={1000} precision={0} style={{ width: "100%" }} />
              </Form.Item>
            </div>

            <Form.Item
              name="targetUrl"
              label="Target URL"
              rules={[
                { required: true, message: "Target URL is required" },
                {
                  validator: (_, v: string) =>
                    !v || isHttpsUrl(v.trim()) ? Promise.resolve() : Promise.reject(new Error("Must be a valid https:// URL")),
                },
              ]}
            >
              <Input
                placeholder="https://advertiser.example/offer"
                suffix={
                  <Button
                    type="link"
                    size="small"
                    icon={<ExportOutlined />}
                    disabled={!isHttpsUrl(targetUrl.trim())}
                    onClick={() => window.open(targetUrl.trim(), "_blank", "noopener,noreferrer")}
                    style={{ padding: 0, height: "auto" }}
                  >
                    Test link
                  </Button>
                }
              />
            </Form.Item>

            <div style={{ display: "flex", gap: 16 }}>
              <Form.Item
                name="backgroundColor"
                label="Background color"
                style={{ flex: 1 }}
                getValueFromEvent={(c: Color | null) => (c ? c.toHexString().toUpperCase() : null)}
              >
                <ColorPicker allowClear disabledAlpha showText format="hex" onClear={() => form.setFieldValue("backgroundColor", null)} />
              </Form.Item>
              <Form.Item
                name="ctaColor"
                label="Button color"
                style={{ flex: 1 }}
                getValueFromEvent={(c: Color | null) => (c ? c.toHexString().toUpperCase() : null)}
              >
                <ColorPicker allowClear disabledAlpha showText format="hex" onClear={() => form.setFieldValue("ctaColor", null)} />
              </Form.Item>
            </div>

            <Form.Item name="schedule" label="Schedule" extra="Leave empty to run until paused.">
              <DatePicker.RangePicker
                showTime={{ format: "HH:mm" }}
                format="D MMM YYYY, HH:mm"
                allowEmpty={[true, true]}
                placeholder={["Start (now)", "End (never)"]}
                style={{ width: "100%" }}
              />
            </Form.Item>

            {formPlacement === "ORDER_SUCCESS" && (
              <Form.Item
                name="displaySeconds"
                label={`Display time: ${watched?.displaySeconds ?? 6}s`}
                extra="How long the order success screen holds before moving to the order."
              >
                <Slider min={AD_LIMITS.displaySecondsMin} max={AD_LIMITS.displaySecondsMax} marks={{ 3: "3s", 6: "6s", 10: "10s", 15: "15s" }} />
              </Form.Item>
            )}

            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>

          <div style={{ position: "sticky", top: 0, flexShrink: 0 }}>
            <div className="ds-section-label" style={{ marginBottom: 8, fontSize: 12, color: "#64748B" }}>
              Live preview · {spec.label}
            </div>
            <AdPreview
              data={{
                placement: formPlacement,
                advertiserName: watched?.advertiserName,
                title: watched?.title,
                subtitle: watched?.subtitle,
                ctaText: watched?.ctaText,
                backgroundColor: watched?.backgroundColor,
                ctaColor: watched?.ctaColor,
                displaySeconds: watched?.displaySeconds,
                image: watched?.image,
              }}
            />
          </div>
        </div>
      </DrawerForm>
    </>
  );
}

// ─────────────────────────────────────────────
//  Settings tab
// ─────────────────────────────────────────────

function SettingsTab() {
  const { message } = App.useApp();
  const [form] = Form.useForm<AdSettings>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        form.setFieldsValue(await adService.getSettings());
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Failed to load ad settings");
      } finally {
        setLoading(false);
      }
    })();
  }, [form, message]);

  const save = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    try {
      form.setFieldsValue(await adService.updateSettings(values));
      message.success("Ad settings saved");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to save ad settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ds-table-wrapper" style={{ padding: 24, maxWidth: 560 }}>
      <Form form={form} layout="vertical" disabled={loading}>
        <Form.Item
          name="cartAdFrequency"
          label="Cart ad frequency"
          extra="Show a sponsored row after every N cart items (and always one after the last item)."
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={10} precision={0} suffix="items" style={{ width: 200 }} />
        </Form.Item>
        <Form.Item
          name="homeAutoRotateSecs"
          label="Home carousel rotation"
          extra="Seconds between slides when more than one home banner is live."
          rules={[{ required: true }]}
        >
          <InputNumber min={2} max={30} precision={0} suffix="seconds" style={{ width: 200 }} />
        </Form.Item>
        <Button className="ds-btn-primary" onClick={save} loading={saving}>
          Save settings
        </Button>
      </Form>
    </div>
  );
}

const Advertisements = () => (
  <div style={{ padding: "24px" }}>
    <div className="ds-page-header">
      <h1 className="ds-page-title">Advertisements</h1>
    </div>
    <Tabs
      defaultActiveKey="ads"
      destroyOnHidden
      items={[
        { key: "ads", label: "Ads", children: <AdsTab /> },
        { key: "settings", label: "Settings", children: <SettingsTab /> },
      ]}
    />
  </div>
);

export default Advertisements;
