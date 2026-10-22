import * as React from "react"
import staffFrontTemplate from "@/assets/SF.jpg"
import juniorStaffFrontTemplate from "@/assets/JF.jpg"
import { resolveApiAssetUrl } from "@/lib/studentApi"
import {
  fitTextCandidatesToWidth,
  normalizeSingleLineText,
  type TextFitOptions,
} from "@/utils/cardTextFit"
import { buildStaffDisplayName } from "@/utils/staffName"
import { abbreviateStaffRank } from "@/utils/staffRank"
import { isJuniorStaffTemplate } from "@/utils/staffTemplate"

type StaffIdCardFrontPreviewProps = {
  data: {
    fileNo: string
    pfNumber?: string
    firstName?: string
    otherName?: string
    lastName?: string
    category?: string
    department?: string
    rank?: string
    photoProcessed?: string
    signatureProcessed?: string
  }
  size?: "compact" | "full"
  forceScale?: number
}

type OverlayBox = {
  left: number
  top: number
  width: number
  height: number
}

const TEMPLATE_WIDTH = 439
const TEMPLATE_HEIGHT = 683

// Calibrated to SF.jpg guides.
const PHOTO_BOX: OverlayBox = { left: 127, top: 309, width: 185, height: 192 }
const NAME_BOX: OverlayBox = { left: 151, top: 516, width: 229, height: 25 }
const DEPARTMENT_BOX: OverlayBox = { left: 144, top: 544, width: 235, height: 25 }
const RANK_BOX: OverlayBox = { left: 173, top: 573, width: 207, height: 25 }
const FILE_NO_BOX: OverlayBox = { left: 199, top: 600, width: 190, height: 25 }
const SIGNATURE_BOX: OverlayBox = { left: 200, top: 629, width: 110, height: 26 }

const NAME_TEXT_FIT: TextFitOptions = {
  maxFontSize: 22,
  minFontSize: 11,
  paddingLeft: 1,
  safeMargin: 2,
  targetWidthRatio: 0.92,
  maxStretchLetterSpacing: 0.03,
  letterSpacingCandidates: [0.015, 0.01, 0.005, 0],
}

const DEPARTMENT_TEXT_FIT: TextFitOptions = {
  maxFontSize: 22,
  minFontSize: 11,
  paddingLeft: 1,
  safeMargin: 2,
  targetWidthRatio: 0.92,
  maxStretchLetterSpacing: 0.03,
  letterSpacingCandidates: [0.015, 0.01, 0.005, 0],
}

const RANK_TEXT_FIT: TextFitOptions = {
  maxFontSize: 24,
  minFontSize: 11,
  paddingLeft: 1,
  safeMargin: 2,
  targetWidthRatio: 0.9,
  maxStretchLetterSpacing: 0.02,
  letterSpacingCandidates: [0.012, 0.008, 0.004, 0],
}

const FILE_NO_TEXT_FIT: TextFitOptions = {
  maxFontSize: 21,
  minFontSize: 15,
  paddingLeft: 1,
  safeMargin: 2,
  targetWidthRatio: 0.94,
  maxStretchLetterSpacing: 0.02,
  letterSpacingCandidates: [0.012, 0.008, 0.004, 0],
}

function toPx(value: number) {
  return `${value}px`
}

function toBoxStyle(box: OverlayBox) {
  return {
    left: toPx(box.left),
    top: toPx(box.top),
    width: toPx(box.width),
    height: toPx(box.height),
  } as const
}

function normalizeField(value?: string | null) {
  return normalizeSingleLineText(value)
}

function buildFullName(data: StaffIdCardFrontPreviewProps["data"]) {
  return buildStaffDisplayName({
    firstName: data.firstName,
    otherName: data.otherName,
    lastName: data.lastName,
  })
}

function buildRawFullName(data: StaffIdCardFrontPreviewProps["data"]) {
  return [data.lastName, data.otherName, data.firstName]
    .map(normalizeField)
    .filter(Boolean)
    .join(" ")
    .trim()
}

function formatText(value?: string | null) {
  const normalized = normalizeField(value)
  return normalized ? normalized.toUpperCase() : "--"
}

export function StaffIdCardFrontPreview({ data, size = "full", forceScale }: StaffIdCardFrontPreviewProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = React.useState(forceScale ?? 1)
  const [fontMeasurementReady, setFontMeasurementReady] = React.useState(false)
  const photoSrc = resolveApiAssetUrl(data.photoProcessed)
  const signatureSrc = resolveApiAssetUrl(data.signatureProcessed)
  const [photoLoadFailed, setPhotoLoadFailed] = React.useState(false)
  const [signatureLoadFailed, setSignatureLoadFailed] = React.useState(false)
  const activeFrontTemplate = isJuniorStaffTemplate({
    category: data.category,
    pfNumber: data.pfNumber,
    fileNo: data.fileNo,
  })
    ? juniorStaffFrontTemplate
    : staffFrontTemplate

  React.useEffect(() => {
    if (typeof forceScale === "number" && Number.isFinite(forceScale) && forceScale > 0) {
      setScale(forceScale)
      return
    }

    const wrapper = wrapperRef.current
    if (!wrapper) return

    const syncScale = () => {
      const nextScale = wrapper.clientWidth / TEMPLATE_WIDTH
      if (Number.isFinite(nextScale) && nextScale > 0) {
        setScale(nextScale)
      }
    }

    syncScale()
    window.addEventListener("resize", syncScale)
    window.addEventListener("beforeprint", syncScale)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(syncScale)
      observer.observe(wrapper)
    }

    return () => {
      window.removeEventListener("resize", syncScale)
      window.removeEventListener("beforeprint", syncScale)
      observer?.disconnect()
    }
  }, [forceScale])

  React.useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) {
      setFontMeasurementReady(true)
      return
    }
    let cancelled = false
    void document.fonts.ready
      .then(() => {
        if (!cancelled) setFontMeasurementReady(true)
      })
      .catch(() => {
        if (!cancelled) setFontMeasurementReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    setPhotoLoadFailed(false)
  }, [photoSrc])

  React.useEffect(() => {
    setSignatureLoadFailed(false)
  }, [signatureSrc])

  const rawFullName = formatText(buildRawFullName(data))
  const preferredFullName = formatText(buildFullName(data))
  const department = formatText(data.department)
  const abbreviatedRank = abbreviateStaffRank(data.rank)
  const rawRank = formatText(data.rank)
  const rank = formatText(abbreviatedRank)
  const fileNo = formatText(data.fileNo)

  const nameFit = React.useMemo(
    () => {
      void fontMeasurementReady
      return fitTextCandidatesToWidth(
        preferredFullName !== rawFullName ? [rawFullName, preferredFullName] : [preferredFullName],
        NAME_BOX.width,
        NAME_TEXT_FIT
      )
    },
    [fontMeasurementReady, preferredFullName, rawFullName]
  )
  const deptFit = React.useMemo(
    () => {
      void fontMeasurementReady
      return fitTextCandidatesToWidth([department], DEPARTMENT_BOX.width, DEPARTMENT_TEXT_FIT)
    },
    [fontMeasurementReady, department]
  )
  const rankFit = React.useMemo(
    () => {
      void fontMeasurementReady
      return fitTextCandidatesToWidth(
        rawRank !== rank ? [rawRank, rank] : [rank],
        RANK_BOX.width,
        RANK_TEXT_FIT
      )
    },
    [fontMeasurementReady, rank, rawRank]
  )
  const fileNoFit = React.useMemo(
    () => {
      void fontMeasurementReady
      return fitTextCandidatesToWidth([fileNo], FILE_NO_BOX.width, FILE_NO_TEXT_FIT)
    },
    [fontMeasurementReady, fileNo]
  )

  const effectivePhotoSrc = photoLoadFailed ? "" : photoSrc
  const effectiveSignatureSrc = signatureLoadFailed ? "" : signatureSrc
  const wrapperMaxWidthClass =
    size === "compact" ? "max-w-[300px] sm:max-w-[330px] lg:max-w-[340px]" : "max-w-full sm:max-w-[700px]"
  const scaledHeight = TEMPLATE_HEIGHT * scale
  const detailTextClassName =
    "id-card-text absolute flex items-center overflow-hidden text-ellipsis whitespace-nowrap font-bold uppercase leading-none text-black"
  const detailTextStyle = {
    fontFamily: '"Teko", sans-serif',
    paddingLeft: toPx(1),
  } as const

  return (
    <div
      ref={wrapperRef}
      className={`mx-auto w-full ${forceScale ? "" : wrapperMaxWidthClass}`}
      style={forceScale ? { width: toPx(TEMPLATE_WIDTH) } : undefined}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{ height: toPx(scaledHeight) }}
        data-id-card-frame="true"
      >
        <div
          data-id-card-canvas="true"
          className="absolute left-0 top-0 origin-top-left overflow-hidden bg-white"
          style={{
            width: toPx(TEMPLATE_WIDTH),
            height: toPx(TEMPLATE_HEIGHT),
            transform: `scale(${scale})`,
          }}
        >
          <img
            src={activeFrontTemplate}
            alt="Staff ID front template"
            className="absolute inset-0 h-full w-full object-fill"
          />

          <div className="absolute overflow-hidden bg-white" style={toBoxStyle(PHOTO_BOX)}>
            {effectivePhotoSrc ? (
              <img
                src={effectivePhotoSrc}
                alt="Staff portrait"
                crossOrigin="anonymous"
                onError={() => setPhotoLoadFailed(true)}
                className="h-full w-full object-fill"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/70 text-[9px] text-slate-600">
                --
              </div>
            )}
          </div>

          <div
            className={detailTextClassName}
            style={{
              ...toBoxStyle(NAME_BOX),
              ...detailTextStyle,
              fontSize: toPx(nameFit.fontSize),
              letterSpacing: `${nameFit.letterSpacingEm}em`,
            }}
            title={buildRawFullName(data)}
          >
            <span>{nameFit.text}</span>
          </div>

          <div
            className={detailTextClassName}
            style={{
              ...toBoxStyle(DEPARTMENT_BOX),
              ...detailTextStyle,
              fontSize: toPx(deptFit.fontSize),
              letterSpacing: `${deptFit.letterSpacingEm}em`,
            }}
            title={data.department ?? ""}
          >
            <span>{deptFit.text}</span>
          </div>

          <div
            className={detailTextClassName}
            style={{
              ...toBoxStyle(RANK_BOX),
              ...detailTextStyle,
              fontSize: toPx(rankFit.fontSize),
              letterSpacing: `${rankFit.letterSpacingEm}em`,
            }}
            title={abbreviatedRank || data.rank || ""}
          >
            <span>{rankFit.text}</span>
          </div>

          <div
            className={detailTextClassName}
            style={{
              ...toBoxStyle(FILE_NO_BOX),
              ...detailTextStyle,
              fontSize: toPx(fileNoFit.fontSize),
              letterSpacing: `${fileNoFit.letterSpacingEm}em`,
            }}
            title={data.fileNo}
          >
            <span>{fileNoFit.text}</span>
          </div>

          <div className="absolute overflow-hidden bg-white" style={toBoxStyle(SIGNATURE_BOX)}>
            {effectiveSignatureSrc ? (
              <img
                src={effectiveSignatureSrc}
                alt="Staff signature"
                crossOrigin="anonymous"
                onError={() => setSignatureLoadFailed(true)}
                className="h-full w-full object-fill"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-600">--</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
