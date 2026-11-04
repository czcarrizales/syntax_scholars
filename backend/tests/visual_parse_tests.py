

##############
### this file has a bunch of visual parses that may not be used,
### but are here just in case visual parsing is required in the future

### many of the models need pip installs
##############
### brian










# ### this produced the best results so far (better than other yolo) but still about 0.2 seconds per page.
# import time
# from pathlib import Path
# import pymupdf
# import numpy as np
# from huggingface_hub import hf_hub_download
# from doclayout_yolo import YOLOv10
# from ultralytics import YOLO
# import torch
#
# ### SETTINGS
# book_to_test = "sampleBook"
# pages_selected = range(0, 10)
# scale = 1
# image_size = 256
# thread_count = 8
# confidence = 0.2
# device = "cpu"
#
# name_of_model = "Universal"
#
# model_configs = {
#     "DocStructBench": { # 0.23 seconds per page
#         "repo_id": "juliozhao/DocLayout-YOLO-DocStructBench",
#         "filename": "doclayout_yolo_docstructbench_imgsz1024.pt",
#         "loader": YOLOv10
#     },
#     "D4LA_N": { # 0.5 seconds per page
#         "repo_id": "juliozhao/DocLayout-YOLO",
#         "filename": "downstream/D4LA/n_DocLayout-YOLO.pt",
#         "loader": YOLO
#     },
#     "D4LA_S": { # 0.22 seconds per page
#         "repo_id": "juliozhao/DocLayout-YOLO",
#         "filename": "downstream/D4LA/s_DocLayout-YOLO.pt",
#         "loader": YOLO
#     },
#     "M6Doc_N": { # 0.22 seconds per page
#         "repo_id": "juliozhao/DocLayout-YOLO",
#         "filename": "downstream/M6Doc/n_DocLayout-YOLO.pt",
#         "loader": YOLO
#     },
#     "M6Doc_S": { # 0.22 seconds per page
#         "repo_id": "juliozhao/DocLayout-YOLO",
#         "filename": "downstream/M6Doc/s_DocLayout-YOLO.pt",
#         "loader": YOLO
#     },
#     "Universal": {  # 0.22 seconds per page
#         "repo_id": "juliozhao/DocLayout-YOLO",
#         "filename": "universal/DocLayout-YOLO-universal.pt",
#         "loader": YOLO
#     },
# }
# ### end of SETTINGS
#
# torch.set_num_threads(thread_count)
# print(torch.get_num_threads())
#
# pdf_path = Path("test_pdfs") / f"{book_to_test}.pdf"
# output_path = Path("layout_results") / f"{book_to_test}_YOLO_annotated.pdf"
# output_path.parent.mkdir(exist_ok=True)
#
# model_path = hf_hub_download(
#     repo_id="juliozhao/DocLayout-YOLO-DocStructBench",
#     filename="doclayout_yolo_docstructbench_imgsz1024.pt" # doesn't change with image_size
# )
# model = YOLOv10(model_path)
#
# with pymupdf.open(pdf_path) as original:
#     pdf = pymupdf.open()
#
#     for page_num in pages_selected:
#         if page_num >= len(original):
#             break
#
#         start = time.perf_counter()
#
#         pdf.insert_pdf(original, from_page=page_num, to_page=page_num)
#         page = pdf[-1]
#
#         pix = page.get_pixmap(
#             matrix=pymupdf.Matrix(scale, scale),
#             colorspace=pymupdf.csRGB,
#             alpha=False
#         )
#
#         image = np.frombuffer(
#             pix.samples,
#             dtype=np.uint8
#         ).reshape(pix.height, pix.width, 3).copy()
#
#         results = model.predict(
#             image,
#             imgsz=image_size,
#             conf=0.2,
#             device="cpu",
#             verbose=False
#         )
#
#         for box in results[0].boxes:
#             x0, y0, x1, y1 = box.xyxy[0].tolist()
#
#             label = results[0].names[int(box.cls[0])]
#             score = float(box.conf[0])
#
#             rect = pymupdf.Rect(
#                 x0 / scale, y0 / scale,
#                 x1 / scale, y1 / scale
#             )
#
#             color = (0, 0, 1) if label.lower() in ("text", "plain text") else (1, 0, 0)
#
#             page.draw_rect(rect, color=color, width=1.5)
#
#             label_text = f"{label} ({score:.0%})"
#             font_size = 7
#             padding = 3
#             text_width = pymupdf.get_text_length(label_text, fontsize=font_size)
#
#             label_rect = pymupdf.Rect(
#                 rect.x0, rect.y0,
#                 rect.x0 + text_width + padding * 2,
#                 rect.y0 + font_size + padding * 2
#             )
#
#             page.draw_rect(label_rect, color=color, fill=color, width=0)
#             page.insert_text(
#                 (rect.x0 + padding, rect.y0 + font_size + padding),
#                 label_text,
#                 fontsize=font_size,
#                 color=(1, 1, 1)
#             )
#
#         elapsed = time.perf_counter() - start
#         print(f"Page {page_num + 1}: {elapsed:.3f} seconds ")
#         # print(results[0].speed)
#
#     pdf.save(output_path)
#     pdf.close()
#
# print(f"Annotated PDF saved to: {output_path}")




# ### page labeling of element types (sophisticated model that succeeds)
# ## Page labeling of element types using PP-DocLayout
# ## the best model is 17cls with scale 1 (0.5 seconds per page with moderate accuracy)
#
# from pathlib import Path
# import pymupdf
# from paddleocr import LayoutDetection
# import time
#
# ###SETTINGS
# book_to_test = "sampleBook" # sampleBook, sampleBook_long
# pages_selected = range(0, 10)
# scale = 1 # defines render accuracy of page. higher is more pixels (2 is default)
# name_of_model = "PicoDet-S_layout_17cls"
# model_configs = {
#     "PP-DocLayoutV2": { #highly accurate but 5 seconds per page
#         "enable_mkldnn": True
#     },
#     "PP-DocLayout-S": { #low accuracy, 0.5 seconds per page
#         "enable_mkldnn": False
#     },
#     "PP-DocLayout-M": { #lowish accuracy, 1 second per page
#         "enable_mkldnn": False
#     },
#     "PicoDet_layout_1x": { #decent accurcy, 1 seconds per page
#         "device": "cpu",
#         "enable_mkldnn": False
#     },
#     "PicoDet_layout_1x_table": { # doesn't detect?
#         "device": "cpu",
#         "enable_mkldnn": False
#     },
#     "PicoDet-S_layout_3cls": { # doesn't detect?
#         "device": "cpu",
#         "enable_mkldnn": False
#     },
#     "PicoDet-S_layout_17cls": { #decent accuracy, 0.5 seconds per page (scale=1 seems to work best)
#         "device": "cpu",
#         "enable_mkldnn": False,
#     },
# }
# model = LayoutDetection(
#     model_name=name_of_model,
#     **model_configs[name_of_model]
# )
# ###end of SETTINGS
#
# pdf_path = Path("test_pdfs/" + book_to_test + ".pdf")
# output_path = Path("layout_results/" + book_to_test + "_annotated_" + name_of_model + "_scale" + str(scale) + ".pdf")
#
# output_path.parent.mkdir(exist_ok=True)
#
# colors = {
#     "text": (0, 0, 1),
#     "table": (1, 0, 0),
#     "paragraph_title": (0, 0.6, 0),
# }
#
# image_path = output_path.parent / "temp_page.png"
#
# with pymupdf.open(pdf_path) as original:
#     pdf = pymupdf.open()
#
#     start_time = time.perf_counter()
#
#     for page_num in pages_selected:
#         if page_num >= len(original):
#             break
#
#         # Copy selected page into output PDF
#         pdf.insert_pdf(
#             original,
#             from_page=page_num,
#             to_page=page_num
#         )
#
#         page = pdf[-1]
#
#         # Render page at 2x resolution
#         pix = page.get_pixmap(
#             matrix=pymupdf.Matrix(scale, scale)
#         )
#         pix.save(str(image_path))
#
#         # Run layout detection
#         results = model.predict(
#             str(image_path),
#             batch_size=1
#         )
#
#         for result in results:
#             boxes = result.json.get("res", result.json)["boxes"]
#
#             for box in boxes:
#                 x0, y0, x1, y1 = box["coordinate"]
#
#                 rect = pymupdf.Rect(
#                     x0 / scale,
#                     y0 / scale,
#                     x1 / scale,
#                     y1 / scale
#                 )
#
#                 label = box["label"]
#                 score = box["score"]
#                 color = colors.get(label, (0.5, 0.5, 0.5))
#
#                 # Draw bounding box
#                 page.draw_rect(
#                     rect,
#                     color=color,
#                     width=1.5
#                 )
#
#                 label_text = f"{label} ({score:.0%})"
#                 font_size = 7
#                 padding = 3
#
#                 # Calculate label width
#                 text_width = pymupdf.get_text_length(
#                     label_text,
#                     fontsize=font_size
#                 )
#
#                 # Label background
#                 label_rect = pymupdf.Rect(
#                     rect.x0,
#                     rect.y0,
#                     rect.x0 + text_width + padding * 2,
#                     rect.y0 + font_size + padding * 2
#                 )
#
#                 page.draw_rect(
#                     label_rect,
#                     color=color,
#                     fill=color,
#                     width=0
#                 )
#
#                 # White label text
#                 page.insert_text(
#                     (rect.x0 + padding, rect.y0 + font_size + padding),
#                     label_text,
#                     fontsize=font_size,
#                     color=(1, 1, 1)
#                 )
#
#         elapsed = time.perf_counter() - start_time
#         print(f"Page {page_num + 1}: {elapsed:.3f} seconds")
#
#     pdf.save(output_path)
#     pdf.close()
#
# image_path.unlink(missing_ok=True)
#
# print(f"Annotated PDF saved to: {output_path}")


# ### this uses a more sophisticated modeling for element type to return bounding areas of each type ( it seems to actually work!)
# from pathlib import Path
# import pymupdf
#
# from paddleocr import LayoutDetection
#
# testing_dir = Path("test_pdfs")
# output_dir = Path("layout_results")
# output_dir.mkdir(exist_ok=True)
#
# model = LayoutDetection(model_name="PP-DocLayoutV2")
#
# for file in testing_dir.glob("sampleBook.pdf"):
#     print(f"\nFILE: {file.name}")
#
#     # Render the first PDF page as an image
#     with pymupdf.open(file) as pdf:
#         page = pdf[0]
#         pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2))
#
#     image_path = output_dir / f"{file.stem}_page1.png"
#     pix.save(str(image_path))
#
#     # Detect and classify page regions
#     results = model.predict(str(image_path), batch_size=1)
#
#     for result in results:
#         result.print()
#         result.save_to_img(save_path=str(output_dir))
#         result.save_to_json(
#             save_path=str(output_dir / f"{file.stem}_layout.json")
#         )




# ### THIS USES VLM (visual language model) TO IDENTIFY CONTENTS OF A PAGE (failed to identify sambleBook.pdf table)
# from pathlib import Path
# from docling.datamodel.base_models import InputFormat
# from docling.document_converter import DocumentConverter, PdfFormatOption
# from docling.pipeline.vlm_pipeline import VlmPipeline
# from docling.datamodel.pipeline_options import (
#     VlmPipelineOptions,
#     VlmConvertOptions,
# )
#
# options = VlmPipelineOptions()
# options.vlm_options = VlmConvertOptions.from_preset("granite_docling")
# options.vlm_options.force_backend_text = True # this setting should extract the original file contents instead of the VLM itself parsing text
#
#
# testing_dir = Path("test_pdfs")
#
# converter = DocumentConverter(
#     format_options={
#         InputFormat.PDF: PdfFormatOption(
#             pipeline_cls=VlmPipeline
#         )
#     }
# )
#
# for file in testing_dir.glob("sampleBook.pdf"):
#     print(f"\nFILE: {file.name}")
#
#     result = converter.convert(file, page_range=(1, 1))
#
#     for item, level in result.document.iterate_items():
#         print(item.label, ":", getattr(item, "text", ""))




# ###### DOCLING WITH ERGET LARGE and XLARGE (second and third) MODEL (both models failed to identify sambleBook.pdf table)
# model_chosen = "layout_egret_xlarge" # "layout_egret_large", "layout_egret_xlarge"
# from pathlib import Path
# from docling.datamodel.base_models import InputFormat
# from docling.datamodel.pipeline_options import (
#     PdfPipelineOptions,
#     LayoutObjectDetectionOptions,
# )
# from docling.document_converter import (
#     DocumentConverter,
#     PdfFormatOption,
# )
#
# testing_dir = Path("test_pdfs")
#
# pipeline_options = PdfPipelineOptions()
# pipeline_options.layout_options = (
#     LayoutObjectDetectionOptions.from_preset(model_chosen)
# )
#
# converter = DocumentConverter(
#     format_options={
#         InputFormat.PDF: PdfFormatOption(
#             pipeline_options=pipeline_options
#         )
#     }
# )
#
# for file in testing_dir.glob("sampleBook.pdf"):
#     print(f"\nFILE: {file.name}")
#
#     result = converter.convert(file, page_range=(1, 1))
#
#     for item, level in result.document.iterate_items():
#         print(item.label, ":", getattr(item, "text", ""))

# #### DOCLING HERON (first) MODEL (both models failed to identify sambleBook.pdf table)
# from pathlib import Path
# from docling.document_converter import DocumentConverter
#
# testing_dir = Path("test_pdfs")
# converter = DocumentConverter()
#
# for file in testing_dir.glob("*.pdf"):
#     print(f"\nFILE: {file.name}")
#
#     result = converter.convert(file)
#
#     for item, level in result.document.iterate_items():
#         print(item.label, ":", getattr(item, "text", ""))



# ######## THIS CODE PRINTS PDF CONTENT TYPE AND SUBSTANCE IN SERIES
# import pymupdf4llm
# from pathlib import Path
#
# testing_dir = Path("test_pdfs")
#
# for file in testing_dir.glob("*.pdf"):
#     pages = pymupdf4llm.to_text(
#         str(file),
#         page_chunks=True
#     )
#
#     print(f"\n=== {file.name} ===")
#
#     for page_number, page in enumerate(pages, start=1):
#         print(f"\n--- page {page_number} ---")
#
#         for box in page["page_boxes"]:
#             start, end = box["pos"]
#             contents = page["text"][start:end]
#             print(f"{box['class']}:{contents}")
