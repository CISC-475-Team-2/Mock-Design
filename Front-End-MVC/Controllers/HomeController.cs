﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Front_End_MVC.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }

        public ActionResult Admin()
        {
            return View();
        }

        public ActionResult MapPartial()
        {
            return PartialView();
        }

        [HttpPost]
        public ActionResult SaveMarker(string data)
        {
            try {
                var jsonData = data;
                var path = Server.MapPath("~/Content/data/data.json");
                System.IO.File.WriteAllText(path, jsonData);
                return Json(new { success = true, responseText = "File saved to server." }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, responseText = "Could not write to server." + ex.ToString() }, JsonRequestBehavior.AllowGet);
            }
        }
    }
}