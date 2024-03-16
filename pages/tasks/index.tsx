import React, { useState, useRef, useEffect } from "react";
import styles from "@/styles/tasks.module.css";
import Image from "next/image";
import { useRouter } from "next/router";
//redux
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/index";

//firebase
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import FirebaseApp from "../../utils/firebase";

// packages
import EmojiPicker from "emoji-picker-react";
import { Tooltip } from "react-tooltip";

import { v4 as uuidv4 } from "uuid";

type Tasks_Content = {
  id: string;
  Project_Title: string;
  Project_Desc: string;
};

type TasksProps = {
  Id?: string | string[] | undefined;
};

type TaskData = {
  id: string;
  Project_Title: string;
  Project_Desc: string;
  userId: string;
};

const initialTaskData: TaskData = {
  id: "",
  Project_Title: "",
  Project_Desc: "",
  userId: "",
};

type TaskContentData = {
  id: string;
  desc: string;
  status: string;
  title: string;
  col: string;
  row: string;
  taskDocId: string;
};

type Task = {
  id: string;
  status: string;
  title: string;
  desc: string;
};

const Tasks = (props: TasksProps) => {
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [taskModalContent, setTaskModalContent] = useState<boolean>(false);
  const [ddOpen, setDDOpen] = useState<boolean>(false);
  const [projectTitle, setProjectTitle] = useState<string>("");
  const [projectDesc, setProjectDesc] = useState<string>("");
  const [uid, setUid] = useState<string>("");
  const [tasksData, setTasksData] = useState<Tasks_Content[]>([]);
  const [taskDocIdData, setTaskDocIdData] = useState(initialTaskData);
  const [taskContentDocData, setTaskContentDocData] = useState<
    TaskContentData[]
  >([]);
  const [userImgURL, setUserImgURL] = useState<string>("");
  const [addEmoji, setAddEmoji] = useState<boolean>(false);
  const [taskDocIds, setTaskDocIds] = useState<string[]>([]);
  const [DocIds, setDocIds] = useState<string[]>([]);
  const [titleCountExc, setTitleCountExc] = useState<boolean>();
  const [wordCountExceeded, setWordCountExceeded] = useState<boolean>(false);

  const [expandModalOpen, setExpandModalOpen] = useState<boolean>(false);
  const [expandTitle, setExpandTitle] = useState<string>("");
  const [expandDesc, setExpandDesc] = useState<string>("");
  const [replyTaskId, setReplyTaskId] = useState<string>("");
  const [textarea, setTextarea] = useState<string>("");

  // draggable functionality based usestate hooks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [customMenuOpen, setCustomMenuOpen] = useState<boolean>(false);
  const [col2MenuOpen, setCol2MenuOpen] = useState<boolean>(false);
  const [col3MenuOpen, setCol3MenuOpen] = useState<boolean>(false);
  const [customMenuPosition, setCustomMenuPosition] = useState({ x: 0, y: 0 });
  const [editMenu, setEditMenu] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");

  const user = useSelector((state: RootState) => state.userName.user);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const db = getFirestore(FirebaseApp);
  const userDocId = useSelector(
    (state: RootState) => state.usersDocId.usersDocId
  );

  const router = useRouter();

  const customMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUserData = () => {
      getDoc(doc(db, "users", `${userDocId}`))
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUid(data.userId);
            setUserImgURL(data.profile_img);
          } else {
            console.log("No such document!");
          }
        })
        .catch((error) => {
          console.error("Error getting document: ", error);
        });
    };
    if (userDocId) {
      getUserData();
    }
  }, [userDocId]);

  useEffect(() => {
    const getTasksData = async () => {
      const q = query(collection(db, "tasks"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      const projectsArray: Tasks_Content[] = [];
      querySnapshot.forEach((doc) => {
        const projectData = { id: doc.id, ...doc.data() } as Tasks_Content;
        projectsArray.push(projectData);
      });
      setTasksData(projectsArray);
    };
    if (userDocId) {
      getTasksData();
    }
  }, [userDocId, ddOpen]);

  useEffect(() => {
    const getTaskDocData = async () => {
      const docRef = doc(db, "tasks", `${props.Id}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const docData = docSnap.data() as TaskData;
        setTaskDocIdData(docData);

        const querySnapshot = await getDocs(
          collection(db, "tasks", `${props.Id}`, "tasks_content")
        );
        const data: TaskContentData[] = [];
        querySnapshot.forEach((doc) => {
          data.push(doc.data() as TaskContentData);
        });
        setTaskContentDocData(data);

        data.forEach((task) => {
          setTaskDocIds([...taskDocIds, task.taskDocId]);
        });
      }
    };
    if (props.Id) {
      getTaskDocData();
    }
  }, [props.Id, tasks]);

  const handleModal = () => {
    setOpenModal(false);
    setTaskModalContent(false);
    setEditMenu(false);
    setProjectTitle("");
    setProjectDesc("");
    setEditTitle("");
    setEditDesc("");
    setWordCountExceeded(false);
    setTitleCountExc(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDDOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleCreate = async () => {
    handleModal();
    try {
      const collectionRef = collection(db, "tasks");
      const currentDate = new Date();
      const dayOfWeek = currentDate.toLocaleDateString("en-US", {
        weekday: "long",
      });
      const formattedDate = currentDate.toLocaleDateString("en-US");
      await addDoc(collectionRef, {
        Project_Title: projectTitle,
        Project_Desc: projectDesc,
        userId: uid,
        Date: formattedDate,
        Day: dayOfWeek,
      });
    } catch (error) {
      console.error("Error creating collection: ", error);
    }
  };

  const handleAddBrick = async () => {
    handleModal();
    try {
      const tasksRef = collection(db, "tasks");

      const subcollectionRef = collection(
        doc(db, "tasks", `${props.Id}`),
        "tasks_content"
      );

      const taskSnapshot = await getDocs(subcollectionRef);
      const tasksCount = taskSnapshot.docs.length;

      const newTask = {
        id: uuidv4(),
        title: projectTitle,
        desc: projectDesc,
        status: "",
        done: "",
        col: tasksCount % 2 == 0 ? "col1" : "col2",
        taskDocId: "",
      };

      const docRef = await addDoc(subcollectionRef, newTask);

      const tasksCollection = collection(
        db,
        "tasks",
        `${props.Id}`,
        "tasks_content"
      );
      const taskDocRef = doc(tasksCollection, docRef.id);
      const addTaskDocId = {
        taskDocId: docRef.id,
      };
      await setDoc(taskDocRef, addTaskDocId, { merge: true });
      setTasks([...tasks, newTask]);
    } catch (error) {
      console.error("Error creating subcollection: ", error);
    }
  };

  const updateBrick = async () => {
    try {
    } catch (error) {}
  };

  const handleEditClick = (id: string, title: string, desc: string) => {
    setEditMenu(true);
    setEditTitle(title);
    setEditDesc(desc);
    setTaskModalContent(true);
    console.log(title, 'title bru')
    console.log(desc, 'desc bru')
  };

  const handleChange =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      switch (key) {
        case "ProjectTitle":
          const title = e.target.value.split(/\s+/);
          if (title.length <= 10) {
            setProjectTitle(e.target.value);
            setTitleCountExc(false);
          } else {
            setTitleCountExc(true);
          }
          break;
        case "ProjectDesc":
          const words = e.target.value.split(/\s+/);
          if (words.length <= 80) {
            setProjectDesc(e.target.value);
            setWordCountExceeded(false);
          } else {
            setWordCountExceeded(true);
          }
          break;
        case "EditTitle":
          const editText = e.target.value.split(/\s+/);
          if (editText.length <= 10) {
            setEditTitle(e.target.value);
            setTitleCountExc(false);
          } else {
            setTitleCountExc(true);
          }
          break;
        case "EditDesc":
          const editDesc = e.target.value.split(/\s+/);
          if (editDesc.length <= 80) {
            setEditDesc(e.target.value);
            setWordCountExceeded(false);
          } else {
            setWordCountExceeded(true);
          }
          break;
      }
    };

  const handlePrjClick = (id: string) => {
    router.push(`/tasks/${userDocId}/${id}`);
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    // taskId: string,
    taskDocId: string
  ) => {
    e.dataTransfer.setData("taskId", taskDocId);
  };

  const handleDragEnd = () => {};

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    targetCol: string
  ) => {
    setHoveredIndex(null);
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const updatedTasks = taskContentDocData.map((task) =>
      task.taskDocId === taskId ? { ...task, col: targetCol } : task
    );
    setTaskContentDocData(updatedTasks);

    const tasksCollection = collection(
      db,
      "tasks",
      `${props.Id}`,
      "tasks_content"
    );

    const taskBoxRef = doc(tasksCollection, taskId);
    try {
      await updateDoc(taskBoxRef, { col: targetCol });
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const handleExpandView = (title: string, desc: string, id: string) => {
    setExpandModalOpen(true);
    setExpandTitle(title);
    setExpandDesc(desc);
    setReplyTaskId(id);
  };

  // will do it late on bro firebase need to know about tasks_content beofre that it need to know about tasks collection
  const handleMsg = async () => {
    const commentsCollection = collection(
      db,
      "tasks_content",
      replyTaskId,
      "comments"
    );
    const newCommentRef = doc(commentsCollection, uid);
    const textCollectionRef = collection(newCommentRef, "text");

    console.log(replyTaskId, "reply task id bro");

    const newComment = {
      profile_img: userImgURL,
      username: user,
    };

    try {
      await setDoc(newCommentRef, newComment);
      await addDoc(textCollectionRef, {
        comment: textarea,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding comment:", error);
    }
    setTextarea("");
  };

  const handleScrollPosition = (rect: any) => {
    const scrollX = document.documentElement.scrollLeft;
    const scrollY = document.documentElement.scrollTop;
    setCustomMenuPosition({ x: rect.left + scrollX, y: rect.bottom + scrollY });
  };

  const handleAddIconClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    handleScrollPosition(rect);
    setCustomMenuOpen(true);
    setCol2MenuOpen(false);
    setCol3MenuOpen(false);
  };

  const handleCol2Menu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    handleScrollPosition(rect);
    setCol2MenuOpen(true);
    setCustomMenuOpen(false);
    setCol3MenuOpen(false);
  };
  const handleCol3Menu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    handleScrollPosition(rect);
    setCol3MenuOpen(true);
    setCustomMenuOpen(false);
    setCol2MenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        customMenuRef.current &&
        !customMenuRef.current.contains(e.target as Node)
      ) {
        setCustomMenuOpen(false);
        setCol2MenuOpen(false);
        setCol3MenuOpen(false);
      }
    };

    if (customMenuOpen || col2MenuOpen || col3MenuOpen) {
      document.addEventListener("click", handleClickOutside);
    } else {
      document.removeEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [customMenuOpen, col2MenuOpen, col3MenuOpen]);

  return (
    <>
      <div className={styles.container}>
        <div className={styles.content_container}>
          <div className={styles.content_div}>
            <div>
              <div className={styles.switch_btn}>
                <div
                  className={styles.dropdown}
                  onClick={() => setDDOpen(!ddOpen)}
                  ref={dropdownRef}
                >
                  <Image
                    src="/large_ViewModule.png"
                    alt="boxes"
                    width={30}
                    height={30}
                    priority={true}
                  />
                  <p>{taskDocIdData.Project_Title}</p>

                  <Image
                    src="/down_btn.png"
                    alt={ddOpen ? "up_btn" : "down_btn"}
                    height={20}
                    width={20}
                    className={ddOpen ? styles.up_btn : ""}
                  />
                </div>

                <div className={styles.btn_div}>
                  <div
                    className={styles.add_icon}
                    onClick={() => setOpenModal(true)}
                    data-tooltip-id="tabsToolTip"
                    data-tooltip-content="create Task"
                  >
                    <Image
                      src="/tabs.png"
                      alt="add"
                      width={30}
                      height={30}
                      priority={true}
                    />
                  </div>

                  <div className={styles.pf_img}>
                    <img src={userImgURL} />
                  </div>
                </div>

                {ddOpen && (
                  <>
                    <div className={styles.drop_box}>
                      <ul className={styles.box_content}>
                        {tasksData &&
                          tasksData.map((tasks, index) => (
                            <div key={index}>
                              <li onClick={() => handlePrjClick(tasks.id)}>
                                {tasks.Project_Title}
                              </li>
                            </div>
                          ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={styles.top_content}>
              <div className={styles.name_desc}>
                <p className={styles.desc}>
                  {props.Id
                    ? taskDocIdData.Project_Desc
                    : "please create a task first using the layer icon placed before your profile image or choose your created task using dropdown :)"}
                </p>
              </div>
            </div>

            <hr className={styles.ruler} />

            <div className={styles.bottom_content}>
              <div className={styles.grid_box}>
                <div className={styles.box_col}>
                  <div className={styles.two_boxes}>
                    <div
                      className={styles.col1}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, "col1")}
                    >
                      {taskContentDocData
                        .filter((item) => item.col === "col1")
                        .map((item, index, array) => (
                          <div key={item.id}>
                            <div
                              key={item.id}
                              className={styles.task_box}
                              draggable
                              onDragStart={(e) =>
                                handleDragStart(e, item.taskDocId)
                              }
                              onDragEnd={handleDragEnd}
                              onDragOver={() => setHoveredIndex(index)}
                              onDragLeave={() => setHoveredIndex(null)}
                            >
                              <div className={styles.tit_desc}>
                                <div>{item.status}</div>
                                <div className={styles.task_title}>
                                  {item.title
                                    ? item.title.length > 30
                                      ? `${item.title.slice(0, 30)}...`
                                      : item.title
                                    : null}
                                </div>
                                <div className={styles.task_desc}>
                                  {item.desc
                                    ? item.desc.length > 300
                                      ? `${item.desc.slice(0, 300)}...`
                                      : item.desc
                                    : null}
                                </div>
                              </div>

                              <div className={styles.task_btn_div}>
                                <div className={styles.thumbs_icon_div}>
                                  <div className={styles.both_icons}>
                                    <button>
                                      <div className={styles.thumb_img}>👍</div>
                                      <span className={styles.thumb_no}></span>
                                    </button>
                                    <button>
                                      <div className={styles.thumb_img}>👎</div>
                                      <span className={styles.thumb_no}></span>
                                    </button>
                                  </div>
                                </div>

                                <div className={styles.three_icon_div}>
                                  <div
                                    className={styles.expand_icon}
                                    onClick={() =>
                                      handleExpandView(
                                        item.title,
                                        item.desc,
                                        item.taskDocId
                                      )
                                    }
                                  >
                                    <Image
                                      src="/expand.png"
                                      alt="expand"
                                      width={15}
                                      height={15}
                                      priority={true}
                                    />
                                  </div>

                                  <div
                                    className={styles.cmnt_icon}
                                    onClick={() =>
                                      handleExpandView(
                                        item.title,
                                        item.desc,
                                        item.taskDocId
                                      )
                                    }
                                  >
                                    <Image
                                      src="/comment.png"
                                      alt="comment"
                                      width={15}
                                      height={15}
                                      priority={true}
                                    />
                                  </div>

                                  <div
                                    className={styles.add_icon}
                                    onClick={(e) => handleAddIconClick(e)}
                                  >
                                    <Image
                                      src="/more.png"
                                      alt="more"
                                      width={26}
                                      height={26}
                                      priority={true}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* {index < array.length - 1 && ( */}
                            {hoveredIndex === index && (
                              <div
                                key={`placeholder-${item.id}`}
                                className={styles.box_placeholder}
                              ></div>
                            )}

                            {customMenuOpen && (
                              <div
                                className={styles.custom_menu}
                                style={{
                                  top: customMenuPosition.y,
                                  left: customMenuPosition.x,
                                }}
                                ref={customMenuRef}
                              >
                                <ul className={styles.menu_li}>
                                  <div
                                    className={styles.menu_edit}
                                    onClick={() =>
                                      handleEditClick(
                                        item.id,
                                        item.title,
                                        item.desc
                                      )
                                    }
                                  >
                                    <div className={styles.menu_edit_img}>
                                      <Image
                                        alt="edit"
                                        src="/menu_edit.png"
                                        width={24}
                                        height={24}
                                        priority={true}
                                      />
                                    </div>
                                    <li className={styles.menu_li_txt}>Edit</li>
                                  </div>

                                  <div className={styles.menu_delete}>
                                    <div className={styles.menu_delete_img}>
                                      <Image
                                        alt="del"
                                        src="/menu_delete_black.png"
                                        width={24}
                                        height={24}
                                        priority={true}
                                      />
                                    </div>
                                    <li className={styles.menu_li_txt}>
                                      Delete
                                    </li>
                                  </div>

                                  <div className={styles.bg_box}></div>
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>

                    <div
                      className={styles.col2}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, "col2")}
                    >
                      {taskContentDocData
                        .filter((item) => item.col === "col2")
                        .map((item, index) => (
                          <div key={item.id}>
                            <div
                              className={styles.task_box}
                              draggable
                              onDragStart={(e) =>
                                handleDragStart(e, item.taskDocId)
                              }
                              onDragEnd={handleDragEnd}
                              onDragOver={() => setHoveredIndex(index)}
                              onDragLeave={() => setHoveredIndex(null)}
                            >
                              <div className={styles.tit_desc}>
                                <div>{item.status}</div>
                                <div className={styles.task_title}>
                                  {item.title
                                    ? item.title.length > 30
                                      ? `${item.title.slice(0, 30)}...`
                                      : item.title
                                    : null}
                                </div>
                                <div className={styles.task_desc}>
                                  {item.desc
                                    ? item.desc.length > 300
                                      ? `${item.desc.slice(0, 300)}...`
                                      : item.desc
                                    : null}
                                </div>
                              </div>

                              <div className={styles.task_btn_div}>
                                <div className={styles.thumbs_icon_div}>
                                  <div className={styles.both_icons}>
                                    <button>
                                      <div className={styles.thumb_img}>👍</div>
                                      <span className={styles.thumb_no}></span>
                                    </button>
                                    <button>
                                      <div className={styles.thumb_img}>👎</div>
                                      <span className={styles.thumb_no}></span>
                                    </button>
                                  </div>
                                </div>

                                <div className={styles.three_icon_div}>
                                  <div
                                    className={styles.expand_icon}
                                    onClick={() =>
                                      handleExpandView(
                                        item.title,
                                        item.desc,
                                        item.taskDocId
                                      )
                                    }
                                  >
                                    <Image
                                      src="/expand.png"
                                      alt="expand"
                                      width={15}
                                      height={15}
                                      priority={true}
                                    />
                                  </div>

                                  <div
                                    className={styles.cmnt_icon}
                                    onClick={() =>
                                      handleExpandView(
                                        item.title,
                                        item.desc,
                                        item.taskDocId
                                      )
                                    }
                                  >
                                    <Image
                                      src="/comment.png"
                                      alt="comment"
                                      width={15}
                                      height={15}
                                      priority={true}
                                    />
                                  </div>

                                  <div
                                    className={styles.add_icon}
                                    onClick={(e) => handleCol2Menu(e)}
                                  >
                                    <Image
                                      src="/more.png"
                                      alt="more"
                                      width={26}
                                      height={26}
                                      priority={true}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {hoveredIndex === index && (
                              <div
                                key={`placeholder-${item.id}`}
                                className={styles.box_placeholder}
                              ></div>
                            )}

                            {col2MenuOpen ? (
                              <>
                                <div
                                  className={styles.custom_menu}
                                  style={{
                                    top: customMenuPosition.y,
                                    left: customMenuPosition.x,
                                  }}
                                  ref={customMenuRef}
                                >
                                  <ul className={styles.menu_li}>
                                    <div
                                      className={styles.menu_edit}
                                      onClick={() =>
                                        handleEditClick(
                                          item.id,
                                          item.title,
                                          item.desc
                                        )
                                      }
                                    >
                                      <div className={styles.menu_edit_img}>
                                        <Image
                                          alt="edit"
                                          src="/menu_edit.png"
                                          width={24}
                                          height={24}
                                          priority={true}
                                        />
                                      </div>
                                      <li className={styles.menu_li_txt}>
                                        Edit
                                      </li>
                                    </div>

                                    <div className={styles.menu_delete}>
                                      <div className={styles.menu_delete_img}>
                                        <Image
                                          alt="del"
                                          src="/menu_delete_black.png"
                                          width={24}
                                          height={24}
                                          priority={true}
                                        />
                                      </div>
                                      <li className={styles.menu_li_txt}>
                                        Delete
                                      </li>
                                    </div>

                                    <div className={styles.bg_box}></div>
                                  </ul>
                                </div>
                              </>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div
                  className={styles.box_col2}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "col3")}
                >
                  {taskContentDocData
                    .filter((item) => item.col === "col3")
                    .map((item, index) => (
                      <div key={item.id}>
                        <div
                          className={styles.task_box}
                          draggable
                          onDragStart={(e) =>
                            handleDragStart(e, item.taskDocId)
                          }
                          onDragEnd={handleDragEnd}
                          onDragOver={() => setHoveredIndex(index)}
                          onDragLeave={() => setHoveredIndex(null)}
                        >
                          <div className={styles.tit_desc}>
                            <div>{item.status}</div>
                            <div className={styles.task_title}>
                              {item.title
                                ? item.title.length > 30
                                  ? `${item.title.slice(0, 30)}...`
                                  : item.title
                                : null}
                            </div>
                            <div className={styles.task_desc}>
                              {item.desc
                                ? item.desc.length > 300
                                  ? `${item.desc.slice(0, 300)}...`
                                  : item.desc
                                : null}
                            </div>
                          </div>

                          <div className={styles.task_btn_done_div}>
                            <div className={styles.three_icon_div}>
                              <div
                                className={styles.expand_icon}
                                onClick={() =>
                                  handleExpandView(
                                    item.title,
                                    item.desc,
                                    item.id
                                  )
                                }
                              >
                                <Image
                                  src="/expand.png"
                                  alt="expand"
                                  width={15}
                                  height={15}
                                  priority={true}
                                />
                              </div>

                              <div
                                className={styles.add_icon}
                                onClick={(e) => handleCol3Menu(e)}
                              >
                                <Image
                                  src="/more.png"
                                  alt="more"
                                  width={26}
                                  height={26}
                                  priority={true}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {hoveredIndex === index && (
                          <div
                            key={`placeholder-${item.id}`}
                            className={styles.box_placeholder}
                          ></div>
                        )}

                        {col3MenuOpen ? (
                          <>
                            <div
                              className={styles.custom_menu}
                              style={{
                                top: customMenuPosition.y,
                                left: customMenuPosition.x,
                              }}
                              ref={customMenuRef}
                            >
                              <ul className={styles.menu_li}>
                                <div
                                  className={styles.menu_edit}
                                  onClick={() =>
                                    handleEditClick(
                                      item.id,
                                      item.title,
                                      item.desc
                                    )
                                  }
                                >
                                  <div className={styles.menu_edit_img}>
                                    <Image
                                      alt="edit"
                                      src="/menu_edit.png"
                                      width={24}
                                      height={24}
                                      priority={true}
                                    />
                                  </div>
                                  <li className={styles.menu_li_txt}>Edit</li>
                                </div>

                                <div className={styles.menu_delete}>
                                  <div className={styles.menu_delete_img}>
                                    <Image
                                      alt="del"
                                      src="/menu_delete_black.png"
                                      width={24}
                                      height={24}
                                      priority={true}
                                    />
                                  </div>
                                  <li className={styles.menu_li_txt}>Delete</li>
                                </div>

                                <div className={styles.bg_box}></div>
                              </ul>
                            </div>
                          </>
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {props.Id && (
        <div className={styles.fixed_add_btn}>
          <div className={styles.short_width_add}>
            <button
              className={styles.add_btn}
              onClick={() => setTaskModalContent(true)}
            >
              <Image
                src="/plus.png"
                alt="plus"
                width={30}
                height={30}
                priority={true}
              />
              Create Brick
            </button>
          </div>
        </div>
      )}

      {openModal || taskModalContent ? (
        <>
          <div className={styles.modal_div}></div>
          <div className={styles.add_modal_bg} onClick={handleModal}>
            <div
              className={styles.add_profile_modal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modal_content}>
                <div>
                  <div>{taskModalContent ? "Brick Title" : "Task Title"}</div>
                  <input
                    type="text"
                    className={`${styles.input} ${
                      titleCountExc ? `${styles.red_border}` : ""
                    }  `}
                    onChange={
                      editMenu
                        ? handleChange("EditTitle")
                        : handleChange("ProjectTitle")
                    }
                    value={editMenu ? editTitle : projectTitle}
                  />
                  {titleCountExc && (
                    <p className={styles.red_text}>Word count exceeded</p>
                  )}
                </div>

                <div>
                  <div>
                    {taskModalContent
                      ? "Brick Description"
                      : "Task Description"}
                  </div>
                  <textarea
                    className={`${styles.textarea} ${
                      wordCountExceeded ? `${styles.red_border}` : ""
                    }  `}
                    onChange={
                      editMenu
                        ? handleChange("EditDesc")
                        : handleChange("ProjectDesc")
                    }
                    value={editMenu ? editDesc : projectDesc}
                  />
                  {wordCountExceeded && (
                    <p className={styles.red_text}>Word count exceeded</p>
                  )}
                </div>

                {taskModalContent ? <div>Brick Status</div> : null}
              </div>

              <div className={styles.btn_div}>
                {editMenu ? (
                  <button className={styles.btn} onClick={updateBrick}>
                    Edit
                  </button>
                ) : (
                  <button
                    className={styles.btn}
                    onClick={taskModalContent ? handleAddBrick : handleCreate}
                  >
                    {taskModalContent ? "Create" : "Create"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {expandModalOpen ? (
        <>
          <div className={styles.modal_div}></div>
          <div
            className={styles.add_modal_bg}
            onClick={() => setExpandModalOpen(false)}
          >
            <div
              className={styles.expand_modal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modal_container}>
                <div className={styles.ex_modal_content}>
                  <div className={styles.left_content}>
                    <div className={styles.title_desc}>
                      <div className={styles.ex_title}>
                        <div className={styles.ex_txt_title}>Title</div>
                        {expandTitle}
                      </div>

                      <div>
                        <div className={styles.ex_txt_desc}>Description</div>
                        {expandDesc}
                      </div>
                    </div>
                  </div>

                  <div className={styles.right_content}>
                    <div className={styles.show_reply}></div>

                    <div className={styles.reply_input_div}>
                      <textarea
                        placeholder="type your reply here..."
                        className={styles.reply_input}
                        onChange={(e) => setTextarea(e.target.value)}
                        value={textarea}
                      />
                      <div
                        className={styles.send_btn}
                        onClick={() => handleMsg()}
                      >
                        <Image
                          alt="send"
                          src="/Sent.png"
                          width={20}
                          height={20}
                          priority={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <Tooltip id="tabsToolTip" place="bottom" />

      {addEmoji ? (
        <>
          <div className={styles.emoji_picker}>
            <EmojiPicker />
          </div>
        </>
      ) : null}
    </>
  );
};

export default Tasks;
