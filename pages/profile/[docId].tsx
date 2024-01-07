// next.js, files, style
import React from "react";
import Sidebar from "@/utils/sidebar";
import Profile from "./index";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
//redux
import { setUser } from "@/store/userName";
import { setUsersDocId } from "@/store/usersDocId";
import { useDispatch } from "react-redux";

//firebase
import { collection, doc, getDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import FirebaseApp from "../../utils/firebase";

const Username = () => {
  const router = useRouter();

  const dispatch = useDispatch();
  const { docId } = router.query;

  const db = getFirestore(FirebaseApp);
  const docRef = doc(db, "users", `${docId}`);

  useEffect(() => {
    getDoc(docRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const name = docSnap.data().username;
          dispatch(setUser(name));
        } else {
          console.log("No such document!");
        }
      })
      .catch((error) => {
        console.error("Error getting document: ", error);
      });
    dispatch(setUsersDocId(docId));
  }, [docId]);

  return (
    <>
      <Sidebar />
      <Profile />
    </>
  );
};

export default Username;