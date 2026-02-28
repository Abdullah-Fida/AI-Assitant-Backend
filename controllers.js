const supabase = require('./config/supabase.js');
const auth = supabase.auth;
const from = (table) => supabase.from(table);
const admin = supabase.auth.admin;

// ==================== AUTH CONTROLLERS ====================
const sign_up = async (req, res) => {
  const { username, email, whatsapp_number, password } = req.body;

  // 1️⃣ Validate input
  if (!username || !email || !password || !whatsapp_number) {
    console.log("Error in the userData")
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if user already exists in user_profiles
    const { data: existingUser, error: existingUserError } = await from('user_profiles')
      .select('id')
      .or(`email.eq.${email},whatsapp_number.eq.${whatsapp_number}`)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ message: "User with this email or WhatsApp number already exists" });
    }

    // 2️⃣ Create Supabase auth user (temporary)
    const { data: authUser, error: authError } = await auth.signUp({
      email,
      password,
      options: {
        data: { username, whatsapp_number }
      }
    });

    if (authError) return res.status(400).json({ message: "Signup failed", authError });
    if (!authUser || !authUser.user) return res.status(400).json({ message: "Signup failed: No user returned" });

    // 3️⃣ Send OTP to phone
    const { data: otpData, error: otpError } = await auth.signInWithOtp({
      phone: whatsapp_number
    });

    if (otpError) {
      // Delete the temporary user if OTP sending failed
      await auth.admin.deleteUser(authUser.user.id);
      return res.status(400).json({ message: "OTP sending failed", otpError });
    }

    // 4️⃣ Return a temporary response (frontend will show OTP input)
    return res.status(200).json({
      message: "OTP sent successfully",
      userId: authUser.user.id
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};



const verify_otp = async (req, res) => {
  console.log("VerifyOtp")
  const { userId, otp, whatsapp_number, username, email } = req.body;

  if (!userId || !otp || !whatsapp_number) {
    return res.status(400).json({ message: "Missing required fields for verification" });
  }

  try {
    const { data, error } = await auth.verifyOtp({
      phone: whatsapp_number,
      token: otp,
      type: 'sms'
    });

    if (error) {
      return res.status(400).json({ message: "OTP verification failed", error });
    }

    // Check if profile exists already (idempotency)
    const { data: existingProfile } = await from("user_profiles").select("*").eq("user_id", userId).maybeSingle();

    if (existingProfile) {
      return res.status(200).json({
        message: "User verified and registered successfully (profile existed)",
        userProfile: existingProfile
      });
    }

    // OTP success → create user profile in DB
    const { data: userProfile, error: userProfileError } = await from("user_profiles")
      .insert({
        user_id: userId,
        username: username,
        email: email,
        whatsapp_number: whatsapp_number,
        current_plan: "free",
        account_status: "active",
        plan_started_at: null,
        plan_expires_at: null,
        trial_started_at: null,
        trial_expires_at: null
      })
      .select()
      .single();

    if (userProfileError) {
      console.error("Profile creation failed:", userProfileError);
      return res.status(400).json({ message: "Profile creation failed", error: userProfileError.message });
    }

    return res.status(200).json({
      message: "User verified and registered successfully",
      userProfile
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// resendOtpController.ts
const resend_otp = async (req, res) => {
  const { userId, whatsapp_number } = req.body;

  if (!userId || !whatsapp_number) {
    return res.status(400).json({ message: "UserId and phone number required" });
  }

  try {
    // Send OTP using Supabase
    const { data, error } = await auth.signInWithOtp({
      phone: whatsapp_number
    });

    if (error) {
      return res.status(400).json({ message: "Failed to resend OTP", error });
    }

    return res.status(200).json({ message: "OTP resent successfully" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};





const log_in = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

  try {
    const { data: userLogin, error: userLoginError } = await auth.signInWithPassword({ email, password });

    if (userLoginError) {
      return res.status(401).json({ message: "Invalid credentials", userLoginError });
    }

    if (!userLogin.session) {
      return res.status(401).json({ message: "Login successful but no session returned. Please check email verification." });
    }

    return res.status(200).json({
      message: "The user has been logged in",
      data: {
        session: userLogin.session,
        user: userLogin.user
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

const sign_out = async (req, res) => {
  const { error: signOutError } = await auth.signOut();
  if (signOutError) return res.status(401).json({ message: "Error occurred while signing out", signOutError });
  return res.status(200).json({ message: "The user has been signed out" });
};

// ==================== PLAN CONTROLLERS ====================

const plan_active = async (req, res) => {
  const plan = req.body.plan;
  const user = req.user;
  if (!user) return res.status(401).json({ message: "The user has not been found" });

  let planDuration;
  if (plan === "free") {
    planDuration = 7;
  } else if (plan === "standard") {
    planDuration = 30;
  } else if (plan === "pro") {
    planDuration = 30;
  } else {
    return res.status(401).json({ message: "Invalid plan selected" });
  }

  const { data: userData, error: userError } = await from("user_profiles")
    .update({
      current_plan: plan,
      account_status: "active",
      plan_started_at: new Date().toISOString(),
      plan_expires_at: new Date(Date.now() + planDuration * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq("user_id", user.id)
    .single();

  if (userError) return res.status(401).json({ message: "User not found", userError });

  return res.status(200).json({ message: "The user plan has been activated", userData });
};

const check_active_plan = async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await from("user_profiles")
    .select("current_plan, trial_expires_at, plan_expires_at")
    .eq("user_id", userId)
    .single();

  if (error) return res.status(400).json({ error });

  const now = new Date();
  let active = false;

  if (data.current_plan === "free") {
    active = data.trial_expires_at && new Date(data.trial_expires_at) > now;
  } else {
    active = data.plan_expires_at && new Date(data.plan_expires_at) > now;
  }

  return res.json({
    can_use_service: active,
    plan: data.current_plan,
  });
};

// ==================== USER PROFILE CONTROLLERS ====================

const get_user_profile = async (req, res) => {
  const user = req.user.id;
  if (!user) return res.status(401).json({ message: "The user has not been found" });

  const { data: userProfile, error: userProfileError } = await from("user_profiles")
    .select("*")
    .eq("user_id", user)
    .single();

  if (userProfileError) return res.status(401).json({ message: "Error while getting the userProfile", userProfileError });

  return res.status(200).json({ message: "The user profile has been fetched", userProfile });
};

const get_active_users_profile = async (req, res) => {
  const { data: activeUserProfile, error: activeUserProfileError } = await from("user_profiles")
    .select("*")
    .eq("account_status", "active");

  if (activeUserProfileError) return res.status(401).json({ message: "Error while getting active users", activeUserProfileError });
  return res.status(200).json({ message: "Active users fetched", activeUserProfile });
};

const get_all_content_of_active_user = async (req, res) => {
  const user = req.user;

  const { data: userProjectData, error: userProjectError } = await from("user_projects")
    .select("*").eq("user_id", user.id);
  const { data: userTasksData, error: userTasksError } = await from("user_tasks")
    .select("*").eq("user_id", user.id);
  const { data: userPaymentsData, error: userPaymentsError } = await from("user_payments")
    .select("*").eq("user_id", user.id);
  const { data: userReminderData, error: userReminderError } = await from("user_reminders")
    .select("*").eq("user_id", user.id);
  const { data: userMessagesData, error: userMessagesError } = await from("user_messages")
    .select("*").eq("user_id", user.id);

  if (userProjectError || userTasksError || userPaymentsError || userReminderError || userMessagesError) {
    return res.status(401).json({
      message: "Error while getting the user content",
      userProjectError, userTasksError, userPaymentsError, userReminderError, userMessagesError
    });
  }

  return res.status(200).json({
    message: "The user content has been fetched",
    data: {
      projects: userProjectData,
      tasks: userTasksData,
      payments: userPaymentsData,
      reminders: userReminderData,
      messages: userMessagesData
    }
  });
};

const delete_due_rows = async (req, res) => {
  try {
    const now = new Date().toISOString(); // Current UTC time

    // Tables to check
    const tables = ['user_tasks', 'user_payments', 'user_reminders', 'user_projects'];

    // Loop over each table
    for (const table of tables) {
      // Delete rows where expires_at <= now
      const { error } = await supabase
        .from(table)
        .delete()
        .lte('expires_at', now);

      if (error) {
        console.error(`Error deleting rows from ${table}:`, error);
      }
    }

    res.json({ status: 'success', message: 'All due rows deleted' });
  } catch (err) {
    console.error('Error in delete_due_rows:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const get_next_24h_items = async (req, res) => {
  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const nowISO = now.toISOString();
    const nextISO = next24Hours.toISOString();

    const tables = [
      "user_tasks",
      "user_payments",
      "user_reminders",
      "user_projects"
    ];

    let allResults = [];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .gte("expires_at", nowISO)
        .lte("expires_at", nextISO);

      if (error) {
        console.error(`Error fetching from ${table}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        // Add table info to each record
        const taggedData = data.map(item => ({
          ...item,
          source_table: table
        }));

        allResults.push(...taggedData);
      }
    }

    // ✅ Group by user_id (WhatsApp number)
    const groupedByUser = {};

    for (const item of allResults) {
      const userId = item.user_id;

      if (!groupedByUser[userId]) {
        groupedByUser[userId] = [];
      }

      groupedByUser[userId].push(item);
    }

    res.json({
      status: "success",
      window: {
        from: nowISO,
        to: nextISO
      },
      users: groupedByUser
    });

  } catch (error) {
    console.error("Error in get_next_24h_items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};







const get_due_reminders = async (req, res) => {
  try {
    const now = new Date().toISOString(); // Current UTC time

    // Tables to check
    const tables = ['user_tasks', 'user_payments', 'user_reminders', 'user_projects'];

    const result = {};

    // Loop over each table
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .lte('expires_at', now); // Only check time

      if (error) {
        console.error(`Error fetching ${table}:`, error);
        result[table] = [];
      } else {
        result[table] = data;
      }
    }

    res.json(result); // JSON object with 4 arrays
  } catch (err) {
    console.error('Error in getDueReminders:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



const create_project = async (req, res) => {
  const { title, description, expires_at, whatsapp_number } = req.body;

  console.log(whatsapp_number)
  const { data: projectData, error: projectError } = await supabase.from("user_projects").insert({
    user_id: whatsapp_number,
    title: title || null,
    description: description || null,
    expires_at: expires_at || null
  });

  console.log(projectError)


  if (projectError) return res.status(401).json({ message: "Error while creating the project", projectError });
  return res.status(200).json({ message: "The project has been created", projectData });
};

const get_project = async (req, res) => {
  const user = req.user.id;
  const { data: getProjectData, error: getProjectError } = await from("user_projects")
    .select("*")
    .eq("user_id", user);

  if (getProjectError) return res.status(401).json({ message: "Error while getting the project", getProjectError });
  return res.status(200).json({ message: "The projects successfully fetched", getProjectData });
};

const delete_project = async (req, res) => {
  const { projectId } = req.params;
  const user = req.user.id;

  const { data: deleteProjectData, error: deleteProjectError } = await from("user_projects")
    .delete()
    .eq("user_id", user)
    .eq("id", projectId);

  if (deleteProjectError) return res.status(401).json({ message: "Error while deleting the project", deleteProjectError });
  return res.status(200).json({ message: "The project has been deleted", deleteProjectData });
};

const update_project_status = async (req, res) => {
  const userId = req.user.id;
  const { projectId, status } = req.body;

  const updates = { status };

  if (status === "completed") {
    updates.completed_at = new Date();
  }

  const { error } = await from("user_projects")
    .update(updates)
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) return res.status(400).json({ error });

  res.json({ message: "Project status updated" });
};

// ==================== TASK CONTROLLERS ====================

const create_task = async (req, res) => {  // Done and tested 
  const { title, description, expires_at, whatsapp_number } = req.body;
  const user = whatsapp_number
  console.log(whatsapp_number)

  const { data: taskData, error: taskError } = await supabase.from("user_tasks").insert({
    user_id: user,
    description: description || null,
    title: title || null,
    expires_at: expires_at || null
  });

  console.log(taskError)

  if (taskError) return res.status(401).json({ message: "Error while creating the task", taskError });
  return res.status(200).json({ message: "The task has been created", taskData });
};

const get_task = async (req, res) => {
  const user = req.user.id;
  const { data: userTaskData, error: userTaskError } = await supabase.from("user_tasks")
    .select("*")
    .eq("user_id", user);

  if (userTaskError) return res.status(401).json({ message: "Error while getting the task", userTaskError });
  return res.status(200).json({ message: "The tasks successfully fetched", userTaskData });
};

const delete_task = async (req, res) => {
  const { taskId } = req.params;
  const user = req.user.id;

  const { data: deleteTaskData, error: deleteTaskError } = await from("user_tasks")
    .delete()
    .eq("user_id", user)
    .eq("id", taskId);

  if (deleteTaskError) return res.status(401).json({ message: "Error while deleting the task", deleteTaskError });
  return res.status(200).json({ message: "The task has been deleted", deleteTaskData });
};

// ==================== PAYMENT CONTROLLERS ====================

const create_payment = async (req, res) => {  // done and tested
  const { title, description, expires_at, whatsapp_number } = req.body;


  const { data: paymentDataa, error: paymentError } = await supabase.from("user_payments").insert({
    user_id: whatsapp_number,
    title: title || null,
    description: description || null,
    expires_at: expires_at
  });

  if (paymentError) return res.status(401).json({ message: "Error while creating the payment", paymentError });
  return res.status(200).json({ message: "The payment has been created", paymentDataa });
};

const get_payment = async (req, res) => {
  const user = req.user.id;
  const { data: userPaymentData, error: userPaymentError } = await from("user_payments")
    .select("*")
    .eq("user_id", user);

  if (userPaymentError) return res.status(401).json({ message: "Error while getting the payment", userPaymentError });
  return res.status(200).json({ message: "The payments successfully fetched", userPaymentData });
};

const mark_payment_paid = async (req, res) => {
  const userId = req.user.id;
  const { paymentId } = req.body;

  const { error } = await from("user_payments")
    .update({
      status: "paid",
      last_follow_up_at: new Date(),
    })
    .eq("id", paymentId)
    .eq("user_id", userId);

  if (error) return res.status(400).json({ error });

  res.json({ message: "Payment marked as paid" });
};

const get_due_payments = async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await from("user_payments")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "overdue"]);

  if (error) return res.status(400).json({ error });

  res.json(data);
};

const delete_payment = async (req, res) => {
  const { paymentId } = req.params;
  const user = req.user.id;

  const { data: deletePaymentData, error: deletePaymentError } = await from("user_payments")
    .delete()
    .eq("user_id", user)
    .eq("id", paymentId);

  if (deletePaymentError) return res.status(401).json({ message: "Error while deleting the payment", deletePaymentError });
  return res.status(200).json({ message: "The payment has been deleted", deletePaymentData });
};

// ==================== REMINDER CONTROLLERS ====================

const create_reminder = async (req, res) => {  // done and tested 

  const {
    title, description, expires_at, whatsapp_number


  } = req.body;
  console.log("CreateReminder api ")
  const { data, error } = await from("user_reminders")
    .insert([{
      user_id: whatsapp_number,
      title: title,
      description: description,
      expires_at: expires_at

    }]);
  console.log(error)

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({
    message: "Reminder created successfully",
    data,
  });
};

const get_reminder = async (req, res) => {
  const user_id = req.user.id;

  const { data, error } = await from("user_reminders")
    .select("*")
    .eq("user_id", user_id)
    .order("remind_at", { ascending: true });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
};

const delete_reminder = async (req, res) => {
  const user_id = req.user.id;
  const { id } = req.params;

  const { error } = await from("user_reminders")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ message: "Reminder deleted" });
};

const cancel_related_reminders = async (req, res) => {
  const userId = req.user.id;
  const { related_type, related_id } = req.body;

  const { error } = await from("user_reminders")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("related_type", related_type)
    .eq("related_id", related_id)
    .eq("status", "pending");

  if (error) return res.status(400).json({ error });

  res.json({ message: "Related reminders cancelled" });
};

// ==================== MESSAGE CONTROLLERS ====================

const create_messages = async (req, res) => {
  const user_id = req.user.id;
  const { content, intent } = req.body;

  const { data, error } = await from("user_messages")
    .insert([{ user_id, content, intent }]);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ message: "Message saved", data });
};

const get_messages = async (req, res) => {
  const user_id = req.user.id;

  const { data, error } = await from("user_messages")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
};

const delete_messages = async (req, res) => {
  const user_id = req.user.id;

  const { error } = await from("user_messages")
    .delete()
    .eq("user_id", user_id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ message: "All messages deleted" });
};

// ==================== CONFIRMATION CONTROLLERS ====================

const create_confirmation = async (req, res) => {
  const user_id = req.user.id;
  const { intent, payload_json, expires_at } = req.body;

  const { data, error } = await from("user_confirmations")
    .insert([{
      user_id,
      intent,
      payload_json,
      confirmation_status: "pending",
      expires_at,
    }]);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({
    message: "Confirmation created",
    data,
  });
};

const get_confirmation = async (req, res) => {
  const user_id = req.user.id;

  const { data, error } = await from("user_confirmations")
    .select("*")
    .eq("user_id", user_id)
    .eq("confirmation_status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data[0] || null);
};

const delete_confirmation = async (req, res) => {
  const user_id = req.user.id;
  const { id } = req.params;

  const { error } = await from("user_confirmations")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ message: "Confirmation deleted" });
};

// ==================== TEMP MESSAGE CONTROLLERS ====================
const create_temp_messages = async (req, res) => {
  try {
    const { whatsapp_number, message_intent, message_content, expires_at } = req.body;

    if (!whatsapp_number || !message_intent || !message_content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user_id = whatsapp_number; // Using WhatsApp number as user ID

    // Insert message directly
    const { data, error } = await supabase
      .from("temp_messages")
      .insert([
        { user_id, message_intent, message_content, expires_at }
      ]).single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ message: "Temp message stored", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const get_temp_messages = async (req, res) => {
  console.log("Api get temp message activated ")

  const { whatsapp_number } = req.body
  console.log(whatsapp_number)

  const { data, error } = await from("temp_messages")
    .select("*")
    .eq("user_id", whatsapp_number)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  console.log(data)
  res.status(200).json(data);
};

const delete_temp_messages = async (req, res) => {
  const { whatsapp_number } = req.body;
  console.log("delete temp message api activated")

  const { error } = await supabase.from("temp_messages")
    .delete()
    .eq("user_id", whatsapp_number);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ message: "Temp messages cleared" });
};


const getUserByWhatsapp = async (req, res) => {
  console.log('📞 getUserByWhatsapp called with:', req.body);
  const { number } = req.body;

  if (!number) {
    return res.status(400).json({ error: 'WhatsApp number is required' });
  }

  console.log('🔍 Searching for number:', number);

  const { data, error } = await from("user_profiles")
    .select("*")
    .eq("whatsapp_number", number)
    .maybeSingle();

  if (error) {
    console.log('❌ User not found:', error.message);
    return res.status(401).json({ found: false, error: 'User not found' });
  }

  console.log('✅ User found:', data);
  res.json(data);
};

module.exports = {
  // Auth
  signup: sign_up,
  verifyOtp: verify_otp,
  resendOtp: resend_otp,
  login: log_in,
  signout: sign_out,

  // Plans
  planActive: plan_active,
  checkActivePlan: check_active_plan,
  getDueReminders: get_due_reminders,
  deleteDueRows: delete_due_rows,
  get24HItem: get_next_24h_items,

  // User Profiles
  getUserProfile: get_user_profile,
  getActiveUsersProfile: get_active_users_profile,
  getAllContentOfActiveUser: get_all_content_of_active_user,
  getUserByWhatsapp,

  // Projects
  createProject: create_project,
  getProject: get_project,
  deleteProject: delete_project,
  updateProjectStatus: update_project_status,

  // Tasks
  createTask: create_task,
  getTask: get_task,
  deleteTask: delete_task,

  // Payments
  createPayment: create_payment,
  getPayment: get_payment,
  deletePayment: delete_payment,
  markPaymentPaid: mark_payment_paid,
  getDuePayments: get_due_payments,

  // Reminders
  createReminder: create_reminder,
  getReminder: get_reminder,
  deleteReminder: delete_reminder,
  cancelRelatedReminders: cancel_related_reminders,

  // Messages
  createMessages: create_messages,
  getMessages: get_messages,
  deleteMessages: delete_messages,

  // Confirmations
  createConfirmation: create_confirmation,
  getConfirmation: get_confirmation,
  deleteConfirmation: delete_confirmation,

  // Temp Messages
  createTempMessages: create_temp_messages,
  getTempMessages: get_temp_messages,
  deleteTempMessages: delete_temp_messages
};